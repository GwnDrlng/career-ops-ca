#!/usr/bin/env node
// audit.mjs — append-only audit trail for the on-prem pipeline (RE_ARCHITECTURE.md
// Part 7E). Every state change and gate decision that matters for accountability
// lands here as one TSV row: routing decisions, kill-switch pause/resume/auto-
// pause, approval requests + approve/reject verdicts, fills, submits, and
// refusals. It is the single queryable record of "what did the pipeline do, when,
// on whose authority, and with what result".
//
// Design rules:
//   * Append-only. Rows are never edited or deleted here — the file is the ledger.
//   * Fail-open for the CALLER. An audit write must never break the pipeline it
//     observes, so appendAudit() swallows its own errors (logged to stderr) and
//     returns false rather than throwing.
//   * cwd-independent. The log path resolves against this file's location (like
//     kill-switch.mjs / approval.mjs), so it works whether the caller runs from
//     the repo root or is spawned with a different cwd.
//   * Tab-safe. Field values have tabs/newlines collapsed to spaces so a stray
//     newline in a reason can't desync the columns.
//
// Usage:
//   node pipeline/audit.mjs tail [n]     # print the last n rows (default 20)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

const COLUMNS = ["timestamp", "actor", "event", "job_id", "company", "role", "result", "detail"];

function logPath() {
  try {
    const guardrails = yaml.load(fs.readFileSync(path.join(PROJECT_ROOT, "config", "guardrails.yml"), "utf8"));
    if (guardrails?.audit?.log) return path.join(PROJECT_ROOT, guardrails.audit.log);
  } catch {
    // fall through to default
  }
  return path.join(PROJECT_ROOT, "data", "audit-log.tsv");
}

function clean(value) {
  if (value == null) return "";
  return String(value).replace(/[\t\r\n]+/g, " ").trim();
}

// Append one audit row. Returns true on success, false if the write failed
// (never throws — the observed action must proceed regardless).
export function appendAudit({ actor = "", event = "", jobId = "", company = "", role = "", result = "", detail = "" } = {}) {
  try {
    const file = logPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) fs.writeFileSync(file, COLUMNS.join("\t") + "\n");
    const row = [
      new Date().toISOString(),
      clean(actor), clean(event), clean(jobId), clean(company), clean(role), clean(result), clean(detail),
    ].join("\t");
    fs.appendFileSync(file, row + "\n");
    return true;
  } catch (err) {
    console.error("[audit] append failed (non-fatal):", err.message);
    return false;
  }
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "tail") {
    const n = parseInt(process.argv[3] || "20", 10);
    const file = logPath();
    if (!fs.existsSync(file)) {
      console.log("(audit log is empty — nothing recorded yet)");
    } else {
      const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
      const header = lines[0];
      const rows = lines.slice(1);
      console.log(header);
      console.log(rows.slice(-n).join("\n"));
    }
  } else {
    console.error("Usage: node pipeline/audit.mjs tail [n]");
    process.exit(1);
  }
}
