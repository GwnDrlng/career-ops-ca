#!/usr/bin/env node
// config-guard.mjs — change control for config/guardrails.yml (RE_ARCHITECTURE.md
// Part 7F). Every threshold in this system lives in one config file, on purpose:
// it makes the guardrails diff-reviewable instead of buried in code. But a config
// edit is itself a governance action — loosening a cost cap or an approval rule
// should leave a trail. This detects any change to guardrails.yml against a stored
// snapshot and writes one audit row per changed key (old -> new), so "who
// widened the daily volume cap, and when?" has an answer.
//
// Run it after editing guardrails.yml (manually, or wire it into a git
// pre-commit hook). It is advisory, not a gate — it records, it never blocks.
//
// Usage:
//   node pipeline/config-guard.mjs check [--reason "..."]   # diff vs snapshot, audit changes, update snapshot
//   node pipeline/config-guard.mjs snapshot                  # (re)baseline without auditing (first run / accepted state)
//   node pipeline/config-guard.mjs diff                       # show changes vs snapshot, don't audit or update

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { appendAudit } from "./audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const GUARDRAILS = path.join(PROJECT_ROOT, "config", "guardrails.yml");
const SNAPSHOT = path.join(PROJECT_ROOT, "data", "guardrails-snapshot.json");

// Flatten nested config to dotted key paths so changes can be diffed key-by-key.
export function flatten(obj, prefix = "") {
  const out = {};
  if (obj === null || typeof obj !== "object") {
    out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    // Arrays compared as a whole (JSON) — order matters for lists like allowlists.
    out[prefix] = JSON.stringify(obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    Object.assign(out, flatten(v, key));
  }
  return out;
}

function loadCurrent() {
  return flatten(yaml.load(fs.readFileSync(GUARDRAILS, "utf8")) || {});
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT)) return null;
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
  } catch {
    return null;
  }
}

function saveSnapshot(flat) {
  fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
  fs.writeFileSync(SNAPSHOT, JSON.stringify(flat, null, 2) + "\n");
}

// Compute added / removed / changed keys between two flattened maps.
export function diffFlat(oldFlat, newFlat) {
  const changes = [];
  const keys = new Set([...Object.keys(oldFlat || {}), ...Object.keys(newFlat)]);
  for (const k of keys) {
    const had = oldFlat && k in oldFlat;
    const has = k in newFlat;
    if (had && !has) changes.push({ key: k, kind: "removed", from: oldFlat[k], to: undefined });
    else if (!had && has) changes.push({ key: k, kind: "added", from: undefined, to: newFlat[k] });
    else if (String(oldFlat[k]) !== String(newFlat[k])) changes.push({ key: k, kind: "changed", from: oldFlat[k], to: newFlat[k] });
  }
  return changes;
}

const cmd = process.argv[2];
const reasonIdx = process.argv.indexOf("--reason");
const reason = reasonIdx !== -1 ? process.argv[reasonIdx + 1] : "";

if (cmd === "snapshot") {
  const flat = loadCurrent();
  saveSnapshot(flat);
  console.log(JSON.stringify({ snapshot: SNAPSHOT, keys: Object.keys(flat).length }, null, 2));
} else if (cmd === "diff" || cmd === "check") {
  const current = loadCurrent();
  const snapshot = loadSnapshot();
  if (snapshot === null) {
    // First run — nothing to diff against. Baseline silently so future edits are caught.
    saveSnapshot(current);
    console.log(JSON.stringify({ baselined: true, keys: Object.keys(current).length, note: "No prior snapshot — baselined. Re-run after your next edit to see changes." }, null, 2));
    process.exit(0);
  }
  const changes = diffFlat(snapshot, current);
  if (cmd === "check") {
    for (const c of changes) {
      appendAudit({
        actor: "config-guard", event: "config.change", result: c.kind,
        detail: `guardrails.yml ${c.key}: ${c.kind === "added" ? "" : `${c.from} → `}${c.kind === "removed" ? "(removed)" : c.to}${reason ? ` — ${reason}` : ""}`,
      });
    }
    saveSnapshot(current);
  }
  console.log(JSON.stringify({ changes, audited: cmd === "check", count: changes.length }, null, 2));
} else {
  console.error("Usage: node pipeline/config-guard.mjs <check|diff|snapshot> [--reason \"...\"]");
  process.exit(1);
}
