#!/usr/bin/env node
// budget-override.mjs — manual "continue anyway" for a budget halt
// (RE_ARCHITECTURE.md Part 7E). A budget ceiling is a safety stop, not a dead
// end: when token-budget.mjs halts an Opus call, opus-call.mjs posts a Slack
// message naming which ceiling was hit and offering a one-time override. A
// verified approver replies `budget-override <token>` and the next Opus call(s)
// for that job proceed despite the ceiling.
//
// The override deliberately mirrors the submit-approval gate (approval.mjs):
//   * approver-bound — only a Slack id in approval.verified_approver_ids can grant.
//   * expiring       — a grant older than budget_override.expiry_hours is dead.
//   * bounded        — one grant permits budget_override.grant_calls Opus calls
//                       (default 3), then it's exhausted and the halt returns.
//   * scoped         — a grant is tied to the job that hit the ceiling (or
//                       "global" when the halted call had no job id). A global
//                       grant matches any job; a job grant matches only that job.
//
// Accepting an override is accepting a *bounded, audited* overspend — every
// request, grant, and use is written to data/audit-log.tsv. State (no secrets)
// lives in data/budget-overrides.json.
//
// Usage:
//   node pipeline/budget-override.mjs list          # pending + granted overrides
//   node pipeline/budget-override.mjs show <token>

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { appendAudit } from "./audit.mjs";
import { isVerifiedApprover } from "./approval.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const STORE_PATH = path.join(PROJECT_ROOT, "data", "budget-overrides.json");

export function getConfig() {
  const guardrails = yaml.load(fs.readFileSync(path.join(PROJECT_ROOT, "config", "guardrails.yml"), "utf8"));
  const b = guardrails.budget_override || {};
  return {
    channel: b.channel || (guardrails.approval && guardrails.approval.channel) || "#job-approvals",
    expiryHours: b.expiry_hours ?? 12,
    grantCalls: b.grant_calls ?? 3,
    waitSeconds: b.wait_seconds ?? 0,
  };
}

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveStore(rows) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(rows, null, 2) + "\n");
}

function scopeKey(jobId) {
  return jobId ? String(jobId) : "global";
}

function isExpired(record, cfg, now) {
  return now - Date.parse(record.createdAt) > cfg.expiryHours * 60 * 60 * 1000;
}

// Ensure exactly one live (pending or granted) override request exists for a
// scope, so a retry-heavy lane that halts repeatedly does not spam Slack with a
// new token every call. Returns { record, isNew } — isNew is true only when a
// fresh request was created (the caller then posts it to Slack).
export function ensurePendingRequest({ which, detail, jobId }, now = Date.now()) {
  const cfg = getConfig();
  const rows = loadStore();
  const scope = scopeKey(jobId);
  const live = rows.find(
    (r) => r.scope === scope && (r.status === "pending" || r.status === "granted") && !isExpired(r, cfg, now)
  );
  if (live) return { record: live, isNew: false };

  const record = {
    token: crypto.randomBytes(16).toString("hex"),
    jobId: jobId || null,
    scope,
    which: which || "budget ceiling",
    detail: detail || "",
    status: "pending",
    createdAt: new Date(now).toISOString(),
    grantedBy: null,
    grantedAt: null,
    callsRemaining: 0,
    consumedAt: null,
  };
  rows.push(record);
  saveStore(rows);
  appendAudit({
    actor: "token-budget", event: "budget.override_requested", result: "pending",
    jobId: jobId || "", detail: `token ${record.token.slice(0, 8)}… — ${record.which}`,
  });
  return { record, isNew: true };
}

// Verified approver grants an override: pending -> granted, loaded with
// grant_calls. Rejections never mutate a still-valid request.
export function grantOverride({ token, approverUserId, now = Date.now() }) {
  const cfg = getConfig();
  const rows = loadStore();
  const record = rows.find((r) => r.token === token);

  const reject = (reason) => {
    appendAudit({
      actor: approverUserId || "unknown", event: "budget.override_rejected", result: "rejected",
      jobId: record?.jobId || "", detail: `token ${String(token).slice(0, 8)}…: ${reason}`,
    });
    return { granted: false, reason, record };
  };

  if (!record) return reject("unknown or invalid override token");
  if (record.status === "granted") return reject("already granted");
  if (record.status === "consumed") return reject("override already used up");
  if (record.status === "expired" || isExpired(record, cfg, now)) {
    record.status = "expired";
    saveStore(rows);
    return reject(`override expired (older than ${cfg.expiryHours}h)`);
  }
  if (!isVerifiedApprover(approverUserId)) {
    return reject(`approver "${approverUserId}" is not in approval.verified_approver_ids`);
  }

  record.status = "granted";
  record.grantedBy = approverUserId;
  record.grantedAt = new Date(now).toISOString();
  record.callsRemaining = cfg.grantCalls;
  saveStore(rows);
  appendAudit({
    actor: approverUserId, event: "budget.override_granted", result: "granted",
    jobId: record.jobId || "", detail: `token ${token.slice(0, 8)}… — ${record.callsRemaining} call(s)`,
  });
  return { granted: true, record };
}

// Consume one call from an active grant matching this job (or a global grant).
// Decrements callsRemaining; marks consumed when it hits zero. Returns the record
// if a grant was applied (caller may proceed with the Opus call), else null.
export function consumeActiveGrant(jobId, now = Date.now()) {
  const cfg = getConfig();
  const rows = loadStore();
  const scope = scopeKey(jobId);
  const grant = rows.find(
    (r) => r.status === "granted" && r.callsRemaining > 0 && !isExpired(r, cfg, now) &&
      (r.scope === "global" || r.scope === scope)
  );
  if (!grant) return null;

  grant.callsRemaining -= 1;
  if (grant.callsRemaining <= 0) {
    grant.status = "consumed";
    grant.consumedAt = new Date(now).toISOString();
  }
  saveStore(rows);
  appendAudit({
    actor: "opus-call", event: "budget.override_used", result: "overridden",
    jobId: jobId || "", detail: `token ${grant.token.slice(0, 8)}… — ${grant.callsRemaining} call(s) left`,
  });
  return grant;
}

// Retire an override request because the operator chose to defer instead of
// continue. Marks it "deferred" so it no longer counts as a live pending request
// (a later halt for the same scope will post a fresh token after resume). No-op
// for an unknown/already-resolved token.
export function deferOverride(token, by = null) {
  const rows = loadStore();
  const record = rows.find((r) => r.token === token);
  if (!record || (record.status !== "pending" && record.status !== "granted")) return null;
  record.status = "deferred";
  record.deferredAt = new Date().toISOString();
  saveStore(rows);
  appendAudit({
    actor: by || "unknown", event: "budget.override_deferred", result: "deferred",
    jobId: record.jobId || "", detail: `token ${token.slice(0, 8)}… — deferred to next daily run`,
  });
  return record;
}

export function getRequest(token) {
  return loadStore().find((r) => r.token === token) || null;
}

export function listActive(now = Date.now()) {
  const cfg = getConfig();
  return loadStore().filter((r) => (r.status === "pending" || r.status === "granted") && !isExpired(r, cfg, now));
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "list") {
    console.log(JSON.stringify(listActive(), null, 2));
  } else if (cmd === "show") {
    console.log(JSON.stringify(getRequest(process.argv[3]), null, 2));
  } else {
    console.error("Usage: node pipeline/budget-override.mjs <list|show <token>>");
    process.exit(1);
  }
}
