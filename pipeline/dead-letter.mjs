#!/usr/bin/env node
// dead-letter.mjs — poison-message handling for the pollers (RE_ARCHITECTURE.md
// Part 7E). Without this, a single un-processable Slack message is a
// head-of-line block: watch.mjs / approval-consumer.mjs deliberately do NOT
// advance their checkpoint past a failed message so it retries next poll — which
// is correct for a transient error but fatal for a permanently-broken message
// (a malformed report, a truncated file). That one message would stall the
// entire queue behind it forever.
//
// The fix: count per-message failures. Under the retry cap, keep the existing
// "hold the queue and retry" behavior (transient errors self-heal). At the cap,
// move the message to a dead-letter ledger, alert, and let the caller advance
// past it so the rest of the queue flows. Nothing is silently dropped — every
// dead-letter is recorded to data/dead-letter.tsv and audited.
//
// This is distinct from kill-switch's auto-pause: auto-pause reacts to N
// consecutive *systemic* failures (stop everything); dead-letter isolates one
// *specific* poison message (skip it, keep going).
//
// Usage:
//   node pipeline/dead-letter.mjs list         # show dead-lettered messages
//   node pipeline/dead-letter.mjs retries       # show current retry counts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { appendAudit } from "./audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const RETRY_STATE = path.join(PROJECT_ROOT, "data", "dead-letter-retries.json");

function cfg() {
  const guardrails = yaml.load(fs.readFileSync(path.join(PROJECT_ROOT, "config", "guardrails.yml"), "utf8"));
  const dl = guardrails.dead_letter || {};
  return {
    maxRetries: dl.max_retries ?? 3,
    store: path.join(PROJECT_ROOT, dl.store || "data/dead-letter.tsv"),
  };
}

function loadRetries() {
  if (!fs.existsSync(RETRY_STATE)) return {};
  try {
    return JSON.parse(fs.readFileSync(RETRY_STATE, "utf8")) || {};
  } catch {
    return {};
  }
}

function saveRetries(map) {
  fs.mkdirSync(path.dirname(RETRY_STATE), { recursive: true });
  fs.writeFileSync(RETRY_STATE, JSON.stringify(map, null, 2) + "\n");
}

function key(source, msgId) {
  return `${source}:${msgId}`;
}

function clean(v) {
  return String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();
}

// Record one processing failure for a message. Returns
// { count, maxRetries, deadLettered }. When the count reaches maxRetries the
// message is appended to the dead-letter ledger, its retry entry is cleared, and
// deadLettered is true — the caller should then advance past it. Below the cap,
// deadLettered is false and the caller should hold the queue and retry.
export function noteFailure(source, msgId, error, excerpt = "") {
  const { maxRetries, store } = cfg();
  const map = loadRetries();
  const k = key(source, msgId);
  const count = (map[k] || 0) + 1;

  if (count >= maxRetries) {
    delete map[k];
    saveRetries(map);
    fs.mkdirSync(path.dirname(store), { recursive: true });
    if (!fs.existsSync(store)) {
      fs.writeFileSync(store, "dead_at\tsource\tmsg_id\tattempts\terror\texcerpt\n");
    }
    fs.appendFileSync(store, [
      new Date().toISOString(), clean(source), clean(msgId), count, clean(error), clean(excerpt).slice(0, 200),
    ].join("\t") + "\n");
    appendAudit({
      actor: source, event: "deadletter.drop", result: "dead-lettered",
      detail: `msg ${msgId} after ${count} attempts: ${clean(error)}`,
    });
    return { count, maxRetries, deadLettered: true };
  }

  map[k] = count;
  saveRetries(map);
  return { count, maxRetries, deadLettered: false };
}

// Clear a message's retry counter after it processes successfully, so the retry
// map doesn't accumulate stale entries.
export function noteSuccess(source, msgId) {
  const map = loadRetries();
  const k = key(source, msgId);
  if (k in map) {
    delete map[k];
    saveRetries(map);
  }
}

export function listDeadLetters() {
  const { store } = cfg();
  if (!fs.existsSync(store)) return [];
  return fs.readFileSync(store, "utf8").split("\n").filter(Boolean).slice(1);
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "list") {
    const rows = listDeadLetters();
    console.log(rows.length ? rows.join("\n") : "(dead-letter queue is empty)");
  } else if (cmd === "retries") {
    console.log(JSON.stringify(loadRetries(), null, 2));
  } else {
    console.error("Usage: node pipeline/dead-letter.mjs <list|retries>");
    process.exit(1);
  }
}
