#!/usr/bin/env node
// approval.mjs — the submit-approval gate (RE_ARCHITECTURE.md Part 7D).
//
// The applier fills a form and STOPS. Before anything is ever submitted, a
// human must approve it from Slack. This module makes that approval a real,
// auditable authorization rather than a plain "looks good" message. Every
// approval request is:
//
//   * single-use     — a token authorizes exactly one submission, then is burned
//                       (config approval.single_use).
//   * expiring       — a request older than approval.expiry_hours is rejected as
//                       stale; you cannot resurrect a day-old fill.
//   * approver-bound — only a Slack user id in approval.verified_approver_ids may
//                       consume it. Anyone else's "approve" is ignored.
//
// State lives in data/approvals.json (gitignored). It carries no secrets — just
// the token, job metadata, and status timeline — so it is safe on disk. The
// actual submit is driven by applier.mjs --submit only after verifyAndConsume()
// returns { approved: true }.
//
// Usage:
//   node pipeline/approval.mjs list
//   node pipeline/approval.mjs show <token>

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { appendAudit } from "./audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const STORE_PATH = path.join(PROJECT_ROOT, "data", "approvals.json");

function loadApprovalConfig() {
  const guardrails = yaml.load(fs.readFileSync(path.join(PROJECT_ROOT, "config", "guardrails.yml"), "utf8"));
  const a = guardrails.approval || {};
  return {
    expiryHours: a.expiry_hours ?? 12,
    singleUse: a.single_use !== false,
    verifiedApprovers: Array.isArray(a.verified_approver_ids) ? a.verified_approver_ids : [],
    channel: a.channel || "#job-approvals",
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

function saveStore(requests) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(requests, null, 2) + "\n");
}

function isExpired(request, cfg, now) {
  const ageMs = now - Date.parse(request.createdAt);
  return ageMs > cfg.expiryHours * 60 * 60 * 1000;
}

// Create a pending approval request for a filled form. Returns the request
// (including its single-use token). The caller (applier.mjs) is responsible for
// posting the token + review context to Slack — approval.mjs stays pure state so
// it is testable without Slack credentials.
export function createApprovalRequest({ jobId, company, role, url, reportPath, screenshotPath }) {
  const requests = loadStore();
  const token = crypto.randomBytes(16).toString("hex");
  const request = {
    token,
    jobId: jobId ?? null,
    company: company ?? null,
    role: role ?? null,
    url: url ?? null,
    reportPath: reportPath ?? null,
    screenshotPath: screenshotPath ?? null,
    status: "pending",
    createdAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null,
    consumedAt: null,
  };
  requests.push(request);
  saveStore(requests);
  appendAudit({
    actor: "applier", event: "approval.request", result: "pending",
    jobId: request.jobId || "", company: request.company || "", role: request.role || "",
    detail: `token ${token.slice(0, 8)}… issued (expires ${cfg_expiry()})`,
  });
  return request;
}

// Short helper for the audit detail — expresses the expiry window without
// re-reading config in the hot path.
function cfg_expiry() {
  return `${loadApprovalConfig().expiryHours}h`;
}

// Verify an approval and burn it (single-use). This is the ONLY sanctioned path
// from "pending" to "authorized to submit". Returns { approved, reason, request }.
// A rejected verification never mutates a still-valid pending request, so a
// wrong-approver or too-early attempt does not consume the token.
export function verifyAndConsume({ token, approverUserId, now = Date.now() }) {
  const cfg = loadApprovalConfig();
  const requests = loadStore();
  const request = requests.find((r) => r.token === token);

  // Route every outcome through one audited exit so no verdict goes unrecorded.
  const reject = (reason) => {
    appendAudit({
      actor: approverUserId || "unknown", event: "approval.rejected", result: "rejected",
      jobId: request?.jobId || "", company: request?.company || "", role: request?.role || "",
      detail: `token ${String(token).slice(0, 8)}…: ${reason}`,
    });
    return { approved: false, reason, request };
  };

  if (!request) return reject("unknown or invalid token");
  if (request.status === "consumed") return reject(`token already used (single-use) at ${request.consumedAt}`);
  if (request.status === "expired") return reject("request already marked expired");
  if (isExpired(request, cfg, now)) {
    request.status = "expired";
    saveStore(requests);
    return reject(`request expired (older than ${cfg.expiryHours}h)`);
  }
  if (cfg.verifiedApprovers.length === 0) {
    return reject("no verified_approver_ids configured in config/guardrails.yml — cannot approve");
  }
  if (!cfg.verifiedApprovers.includes(approverUserId)) {
    return reject(`approver "${approverUserId}" is not in approval.verified_approver_ids`);
  }

  request.status = cfg.singleUse ? "consumed" : "approved";
  request.approvedBy = approverUserId;
  request.approvedAt = new Date(now).toISOString();
  if (cfg.singleUse) request.consumedAt = request.approvedAt;
  saveStore(requests);
  appendAudit({
    actor: approverUserId, event: "approval.approved", result: "approved",
    jobId: request.jobId || "", company: request.company || "", role: request.role || "",
    detail: `token ${String(token).slice(0, 8)}… consumed`,
  });
  return { approved: true, request };
}

// Mark any pending-but-stale requests as expired. Returns the count swept.
// Useful for the consumer loop to keep the store honest without a verify attempt.
export function expireStale(now = Date.now()) {
  const cfg = loadApprovalConfig();
  const requests = loadStore();
  let swept = 0;
  for (const r of requests) {
    if (r.status === "pending" && isExpired(r, cfg, now)) {
      r.status = "expired";
      swept++;
    }
  }
  if (swept) saveStore(requests);
  return swept;
}

export function isVerifiedApprover(userId) {
  return loadApprovalConfig().verifiedApprovers.includes(userId);
}

export function getRequest(token) {
  return loadStore().find((r) => r.token === token) || null;
}

export function listPending(now = Date.now()) {
  const cfg = loadApprovalConfig();
  return loadStore().filter((r) => r.status === "pending" && !isExpired(r, cfg, now));
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "list") {
    console.log(JSON.stringify(listPending(), null, 2));
  } else if (cmd === "show") {
    const token = process.argv[3];
    console.log(JSON.stringify(getRequest(token), null, 2));
  } else {
    console.error("Usage: node pipeline/approval.mjs <list|show <token>>");
    process.exit(1);
  }
}
