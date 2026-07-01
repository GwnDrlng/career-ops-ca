#!/usr/bin/env node
// kill-switch.mjs — the pipeline's emergency stop (RE_ARCHITECTURE.md Part 7D).
// A single paused flag that every automated entry point (route-tier.mjs,
// applier.mjs, watcher/watch.mjs, watcher/approval-consumer.mjs) checks before
// doing any work. While paused, the pipeline scans/routes nothing and submits
// nothing. State lives in data/pipeline-state.json (gitignored) so it survives
// process restarts — a crash mid-pause must NOT silently resume.
//
// Two ways to trip it:
//   1. Manually — `node pipeline/kill-switch.mjs pause "reason"` (or from Slack
//      via the /pause control message handled by watcher/approval-consumer.mjs).
//   2. Automatically — recordFailure() trips it after
//      auto_pause.consecutive_failures (config/guardrails.yml) failures in a row.
//      A single success (resetFailures) clears the streak.
//
// Usage:
//   node pipeline/kill-switch.mjs status
//   node pipeline/kill-switch.mjs pause ["reason"]
//   node pipeline/kill-switch.mjs resume

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { appendAudit } from "./audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const STATE_PATH = path.join(PROJECT_ROOT, "data", "pipeline-state.json");

function loadGuardrails() {
  return yaml.load(fs.readFileSync(path.join(PROJECT_ROOT, "config", "guardrails.yml"), "utf8"));
}

const DEFAULT_STATE = { paused: false, pausedAt: null, pausedReason: null, pausedUntil: null, consecutiveFailures: 0 };

// The next occurrence (ISO) of the daily scan cron, read from the schedule in
// config/guardrails.yml (kept in sync with cloud/agent/schedules/daily-scan.ts).
// Used by `budget-defer` to schedule an auto-resume aligned to the daily cycle.
export function nextDailyCronISO(now = new Date()) {
  const g = loadGuardrails();
  const h = g.schedule?.daily_scan_utc_hour ?? 12;
  const m = g.schedule?.daily_scan_utc_minute ?? 0;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export function getState() {
  if (!fs.existsSync(STATE_PATH)) return { ...DEFAULT_STATE };
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) };
  } catch {
    // A corrupt state file must fail closed — treat as paused so no automated
    // action runs until a human inspects it.
    return { ...DEFAULT_STATE, paused: true, pausedReason: "pipeline-state.json unreadable (failing closed)" };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
  return state;
}

export function isPaused() {
  const state = getState();
  if (!state.paused) return false;
  // Scheduled pause (from `budget-defer`): once the auto-resume window passes,
  // clear the pause on the next check so the pipeline restarts on its own.
  if (state.pausedUntil && Date.now() >= Date.parse(state.pausedUntil)) {
    state.paused = false;
    state.pausedAt = null;
    state.pausedReason = null;
    state.pausedUntil = null;
    state.consecutiveFailures = 0;
    saveState(state);
    appendAudit({ actor: "auto-resume", event: "kill.auto_resume", result: "resumed", detail: "scheduled pause window elapsed" });
    return false;
  }
  return true;
}

export function pause(reason = "manual", by = null) {
  const state = getState();
  const wasPaused = state.paused;
  state.paused = true;
  state.pausedAt = new Date().toISOString();
  state.pausedReason = by ? `${reason} (by ${by})` : reason;
  state.pausedUntil = null; // an indefinite pause overrides any scheduled resume
  saveState(state);
  if (!wasPaused) appendAudit({ actor: by || "cli", event: "kill.pause", result: "paused", detail: reason });
  return state;
}

// Scheduled pause: halt the whole pipeline but record an auto-resume time. Used
// by `budget-defer` to stop until the next daily cron. isPaused() clears it once
// the window passes — no manual /resume needed.
export function pauseUntil(reason, untilISO, by = null) {
  const state = getState();
  state.paused = true;
  state.pausedAt = new Date().toISOString();
  state.pausedUntil = untilISO;
  state.pausedReason = `${reason} — auto-resume at ${untilISO}${by ? ` (by ${by})` : ""}`;
  saveState(state);
  appendAudit({ actor: by || "cli", event: "kill.pause_until", result: "paused", detail: `${reason}; resume ${untilISO}` });
  return state;
}

export function resume(by = null) {
  const state = getState();
  const wasPaused = state.paused;
  state.paused = false;
  state.pausedAt = null;
  state.pausedReason = by ? `resumed by ${by}` : null;
  state.pausedUntil = null;
  state.consecutiveFailures = 0; // a deliberate resume also clears the failure streak
  saveState(state);
  if (wasPaused) appendAudit({ actor: by || "cli", event: "kill.resume", result: "resumed" });
  return state;
}

// Increment the consecutive-failure streak. Auto-pauses (fail closed) once the
// streak reaches auto_pause.consecutive_failures. Returns the new state plus an
// `autoPaused` flag when this call is the one that tripped it.
export function recordFailure(context = "") {
  const guardrails = loadGuardrails();
  const threshold = guardrails.auto_pause?.consecutive_failures ?? Infinity;
  const state = getState();
  state.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
  let autoPaused = false;
  if (!state.paused && state.consecutiveFailures >= threshold) {
    state.paused = true;
    state.pausedAt = new Date().toISOString();
    state.pausedReason = `auto-paused after ${state.consecutiveFailures} consecutive failures${context ? ` (last: ${context})` : ""}`;
    autoPaused = true;
  }
  saveState(state);
  if (autoPaused) {
    appendAudit({ actor: "auto-pause", event: "kill.auto_pause", result: "paused", detail: state.pausedReason });
  }
  return { ...state, autoPaused, threshold };
}

export function resetFailures() {
  const state = getState();
  if (state.consecutiveFailures === 0) return state;
  state.consecutiveFailures = 0;
  return saveState(state);
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "status") {
    console.log(JSON.stringify(getState(), null, 2));
  } else if (cmd === "pause") {
    const reason = process.argv[3] || "manual (CLI)";
    console.log(JSON.stringify(pause(reason), null, 2));
  } else if (cmd === "resume") {
    console.log(JSON.stringify(resume("CLI"), null, 2));
  } else {
    console.error("Usage: node pipeline/kill-switch.mjs <status|pause [reason]|resume>");
    process.exit(1);
  }
}
