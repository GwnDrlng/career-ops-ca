#!/usr/bin/env node
// route-tier.mjs — parse a report's `## Machine Summary` (score, legitimacy),
// apply the safety gates from RE_ARCHITECTURE.md Part 7A/7B, and dispatch to
// the correct tier lane. Writes a TSV to batch/tracker-additions/ and runs
// merge-tracker.mjs for the two apply-eligible lanes — never edits
// data/applications.md directly (see CLAUDE.md Pipeline Integrity rules).
//
// Usage:
//   node route-tier.mjs --report reports/228-acme-2026-07-01.md
//
// Prints a JSON decision object to stdout. Exit code is always 0 (routing
// decisions, including drops, are not process failures) unless the report
// can't be parsed at all.

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import yaml from "js-yaml";
import { legitimacyGate, blocklistGate, duplicateGuard, volumeCapStatus } from "./gates.mjs";
import { parseReport } from "./report-parse.mjs";
import { isPaused, getState } from "./kill-switch.mjs";
import { appendAudit } from "./audit.mjs";

function arg(name, required = false) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return v;
}

const reportPath = arg("report", true);
if (!fs.existsSync(reportPath)) {
  console.error(`Report not found: ${reportPath}`);
  process.exit(1);
}
const parsed = parseReport(reportPath);
if (parsed.score == null || !parsed.company) {
  console.error(`Could not parse company/score from ${reportPath}. Machine Summary or header fields missing/malformed.`);
  process.exit(1);
}

const guardrails = yaml.load(fs.readFileSync("config/guardrails.yml", "utf8"));
const blocklist = fs.existsSync("config/blocklist.yml")
  ? (yaml.load(fs.readFileSync("config/blocklist.yml", "utf8")) || {})
  : {};

const reportNumMatch = reportPath.match(/(\d{3})-/);
const jobId = reportNumMatch ? reportNumMatch[1] : reportPath;

function decide() {
  // Kill switch: while paused, route nothing. The report is already on disk
  // (watch.mjs wrote it), so keep it — it'll be picked up when resumed.
  if (isPaused()) {
    return { lane: "paused", reason: getState().pausedReason || "pipeline paused", keepReport: true };
  }

  const legit = legitimacyGate(parsed.legitimacyTier, guardrails);
  if (legit.blocked) return { lane: "dropped", reason: legit.reason, keepReport: true };

  const block = blocklistGate(parsed.company, blocklist);
  if (block.blocked) return { lane: "dropped", reason: block.reason, keepReport: true };

  const dup = duplicateGuard(parsed.company, parsed.role);
  if (dup.blocked) return { lane: "duplicate", reason: dup.reason, keepReport: true };

  // --- Tier dispatch ---
  const { ignore_max, generic_min, generic_max, curated_min } = guardrails.tiers;
  if (parsed.score <= ignore_max) return { lane: "ignore", keepReport: false };
  if (parsed.score >= generic_min && parsed.score <= generic_max) return { lane: "generic-apply", keepReport: true };
  if (parsed.score >= curated_min) return { lane: "curated-docgen", keepReport: true };
  return { lane: "unrouted", reason: `score ${parsed.score} falls outside all configured tier bounds`, keepReport: true };
}

const decision = decide();

appendAudit({
  actor: "route-tier", event: "route.dispatch", result: decision.lane,
  jobId, company: parsed.company || "", role: parsed.role || "",
  detail: `score ${parsed.score}/5, legitimacy ${parsed.legitimacyTier || "?"}${decision.reason ? ` — ${decision.reason}` : ""}`,
});

// Computed here so the applier can check it before actually submitting, per
// RE_ARCHITECTURE.md Part 7B. Re-checked again at apply time in applier.mjs
// since state may have changed between evaluation and apply.
const volumeCaps = ["generic-apply", "curated-docgen"].includes(decision.lane)
  ? volumeCapStatus(parsed.company, guardrails)
  : null;

// --- Write TSV + merge-tracker for apply-eligible lanes that pass the gates ---
if (["generic-apply", "curated-docgen"].includes(decision.lane)) {
  const slug = parsed.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const tsvPath = `batch/tracker-additions/${jobId}-${slug}.tsv`;
  const date = new Date().toISOString().slice(0, 10);
  const row = [
    jobId, date, parsed.company, parsed.role || "", "Evaluated",
    `${parsed.score.toFixed(1)}/5`, "❌", `[${jobId}](reports/${reportPath.split("/").pop()})`,
    `Routed to ${decision.lane} lane by route-tier.mjs`,
  ].join("\t");
  fs.mkdirSync("batch/tracker-additions", { recursive: true });
  fs.writeFileSync(tsvPath, row + "\n");
  const merge = spawnSync("node", ["merge-tracker.mjs"], { encoding: "utf8" });
  decision.trackerWrite = { tsvPath, mergeExitCode: merge.status, mergeOutput: (merge.stdout || "") + (merge.stderr || "") };
}

// --- Ignore lane: delete the report (per plan, no report stored beyond scan-history), log a one-liner ---
if (decision.lane === "ignore") {
  fs.mkdirSync("data", { recursive: true });
  const logPath = "data/watcher-ignored.tsv";
  if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, "job_id\tcompany\trole\tscore\ttimestamp\n");
  fs.appendFileSync(logPath, [jobId, parsed.company, parsed.role || "", parsed.score, new Date().toISOString()].join("\t") + "\n");
  fs.unlinkSync(reportPath);
}

console.log(JSON.stringify({
  jobId,
  reportPath: decision.keepReport ? reportPath : null,
  ...parsed,
  ...decision,
  volumeCaps,
}, null, 2));
