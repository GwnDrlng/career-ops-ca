#!/usr/bin/env node
// prompt-version.mjs — prompt & rubric versioning (RE_ARCHITECTURE.md Part 7F).
// A grade is only reproducible if you know exactly which rubric/prompt produced
// it. This pins each graded-output artifact to a "<version>+<short hash>" tag:
// the human-meaningful semantic version from config/prompt-versions.yml plus a
// content hash of the actual source bytes. Graded outputs (judge-history,
// calibration-log) record that tag, so any score can be traced back to the exact
// prompt that produced it.
//
// It also catches silent drift: if a source file changes but its version wasn't
// bumped, `check` warns and audits `prompt.version_drift` — because an un-versioned
// prompt edit quietly makes every prior score non-reproducible.
//
// Usage:
//   node pipeline/prompt-version.mjs list           # tags for every registered artifact
//   node pipeline/prompt-version.mjs tag <name>     # print one tag (rubric|judge|grounding)
//   node pipeline/prompt-version.mjs check           # detect + audit un-versioned drift, update hash store

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { appendAudit } from "./audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const REGISTRY = path.join(PROJECT_ROOT, "config", "prompt-versions.yml");
const HASH_STORE = path.join(PROJECT_ROOT, "data", "prompt-hashes.json");

function loadRegistry() {
  return yaml.load(fs.readFileSync(REGISTRY, "utf8")) || {};
}

function shortHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
}

// Return "<version>+<short hash>" for a registered artifact, or null if its
// source is missing. Safe to call at grade time to stamp an output.
export function versionTag(name) {
  const reg = loadRegistry();
  const entry = reg[name];
  if (!entry) return null;
  const src = path.join(PROJECT_ROOT, entry.source);
  if (!fs.existsSync(src)) return `${entry.version}+missing`;
  return `${entry.version}+${shortHash(fs.readFileSync(src, "utf8"))}`;
}

export function allTags() {
  const reg = loadRegistry();
  const out = {};
  for (const name of Object.keys(reg)) out[name] = versionTag(name);
  return out;
}

function loadHashStore() {
  if (!fs.existsSync(HASH_STORE)) return {};
  try {
    return JSON.parse(fs.readFileSync(HASH_STORE, "utf8"));
  } catch {
    return {};
  }
}

function saveHashStore(store) {
  fs.mkdirSync(path.dirname(HASH_STORE), { recursive: true });
  fs.writeFileSync(HASH_STORE, JSON.stringify(store, null, 2) + "\n");
}

// Detect artifacts whose content changed without a version bump. Returns the list
// of drifted artifacts and (on the `check` command) audits each.
export function checkDrift({ audit = false } = {}) {
  const reg = loadRegistry();
  const store = loadHashStore();
  const drift = [];
  const nextStore = {};
  for (const [name, entry] of Object.entries(reg)) {
    const src = path.join(PROJECT_ROOT, entry.source);
    const hash = fs.existsSync(src) ? shortHash(fs.readFileSync(src, "utf8")) : "missing";
    const prev = store[name];
    nextStore[name] = { version: entry.version, hash };
    if (prev && prev.hash !== hash && prev.version === entry.version) {
      // content changed but version stayed the same -> silent drift
      drift.push({ name, version: entry.version, from: prev.hash, to: hash });
      if (audit) {
        appendAudit({
          actor: "prompt-version", event: "prompt.version_drift", result: "drift",
          detail: `${name} content changed (${prev.hash} → ${hash}) without a version bump from ${entry.version}`,
        });
      }
    }
  }
  if (audit) saveHashStore(nextStore);
  return drift;
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "list") {
    console.log(JSON.stringify(allTags(), null, 2));
  } else if (cmd === "tag") {
    const name = process.argv[3];
    const tag = versionTag(name);
    if (!tag) {
      console.error(`Unknown artifact "${name}". Registered: ${Object.keys(loadRegistry()).join(", ")}`);
      process.exit(1);
    }
    console.log(tag);
  } else if (cmd === "check") {
    const drift = checkDrift({ audit: true });
    console.log(JSON.stringify({ drift, count: drift.length }, null, 2));
    if (drift.length) {
      console.error(`\n⚠️  ${drift.length} artifact(s) changed without a version bump. Bump the version in config/prompt-versions.yml so past scores stay reproducible.`);
    }
  } else {
    console.error("Usage: node pipeline/prompt-version.mjs <list|tag <name>|check>");
    process.exit(1);
  }
}
