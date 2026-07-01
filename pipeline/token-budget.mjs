#!/usr/bin/env node
// token-budget.mjs — guards Opus work against four ceilings, all in
// config/guardrails.yml:
//   1. rolling 5-hour token block   (% of your plan's 5h token limit)
//   2. weekly token allowance        (% of your plan's weekly token limit)
//   3. monthly USD cost cap          (halts at cost.monthly_pct % of cost.monthly_cap_usd, calendar month)
//   4. per-application USD cost cap   (hard cap: halts when one job_id's spend ≥ cost.per_application_cap_usd)
// Ledger at data/token-usage.tsv (columns: timestamp, tokens_in, tokens_out,
// model, lane, cost_usd, job_id).
//
// Usage:
//   node token-budget.mjs record --tokens-in N --tokens-out N --model M --lane L [--cost-usd C] [--job-id ID]
//   node token-budget.mjs check [--job-id ID]
//   node token-budget.mjs gate  [--job-id ID]   # exit 1 if halted, 0 otherwise (for scripting)
//
// The token limit_tokens fields and both cost caps default to null because the
// 5h/weekly token allowance depends on your specific Claude plan (not
// API-discoverable) and the $ caps are your choice. Until each is set, check()/
// gate() report "not configured" for that ceiling and never halt on it. The
// per-application ceiling additionally only applies when a --job-id is supplied
// (the Opus callers pass it via opus-call.mjs).

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { appendAudit } from "./audit.mjs";

const guardrails = yaml.load(fs.readFileSync("config/guardrails.yml", "utf8"));
const CFG = guardrails.token_budget;
const COST = guardrails.cost || {};
const LEDGER = CFG.ledger;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function ensureLedger() {
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  if (!fs.existsSync(LEDGER)) {
    fs.writeFileSync(LEDGER, "timestamp\ttokens_in\ttokens_out\tmodel\tlane\tcost_usd\tjob_id\n");
  }
}

function readLedger() {
  ensureLedger();
  const lines = fs.readFileSync(LEDGER, "utf8").trim().split("\n").slice(1);
  return lines.filter(Boolean).map((line) => {
    // Columns were added over time (cost_usd col 6, job_id col 7). Older rows
    // without them parse as 0 / "" — positional parsing stays backward-compatible.
    const [timestamp, tokensIn, tokensOut, model, lane, costUsd, jobId] = line.split("\t");
    return { timestamp, tokensIn: Number(tokensIn), tokensOut: Number(tokensOut), model, lane, costUsd: Number(costUsd) || 0, jobId: jobId || "" };
  });
}

function record(tokensIn, tokensOut, model, lane, costUsd, jobId) {
  ensureLedger();
  const row = [new Date().toISOString(), tokensIn, tokensOut, model, lane || "", costUsd || 0, jobId || ""].join("\t");
  fs.appendFileSync(LEDGER, row + "\n");
}

function usageSince(hoursAgo) {
  const cutoff = Date.now() - hoursAgo * 60 * 60 * 1000;
  return readLedger()
    .filter((r) => new Date(r.timestamp).getTime() >= cutoff)
    .reduce((sum, r) => sum + r.tokensIn + r.tokensOut, 0);
}

// Cost is capped per calendar month (billing-aligned), not a rolling window —
// sum cost_usd of rows dated on/after the 1st of the current UTC month.
function costThisMonth() {
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  return readLedger()
    .filter((r) => new Date(r.timestamp).getTime() >= monthStart)
    .reduce((sum, r) => sum + r.costUsd, 0);
}

// Per-application spend: sum cost_usd across every Opus call tagged with this
// job_id (all-time — an application is short-lived, so no time window). This is
// what makes the per-application cap possible; without job_id in the ledger there
// is nothing to group by.
function costForApplication(jobId) {
  if (!jobId) return 0;
  return readLedger()
    .filter((r) => r.jobId === jobId)
    .reduce((sum, r) => sum + r.costUsd, 0);
}

function windowStatus(usedTokens, limitTokens, pctCeiling) {
  if (limitTokens == null) {
    return { configured: false, used_tokens: usedTokens, halt: false };
  }
  const thresholdTokens = limitTokens * (pctCeiling / 100);
  return {
    configured: true,
    used_tokens: usedTokens,
    limit_tokens: limitTokens,
    ceiling_pct: pctCeiling,
    threshold_tokens: thresholdTokens,
    used_pct_of_limit: Number(((usedTokens / limitTokens) * 100).toFixed(1)),
    halt: usedTokens >= thresholdTokens,
  };
}

// Monthly cost ceiling: halt once this-month spend reaches monthly_pct % of the
// monthly cap. Mirrors windowStatus but in USD. Never halts until a cap is set.
function monthlyCostStatus() {
  const capUsd = COST.monthly_cap_usd;
  const pctCeiling = COST.monthly_pct ?? 75;
  const usedUsd = costThisMonth();
  if (capUsd == null) {
    return { configured: false, used_usd: Number(usedUsd.toFixed(4)), halt: false };
  }
  const thresholdUsd = capUsd * (pctCeiling / 100);
  return {
    configured: true,
    used_usd: Number(usedUsd.toFixed(4)),
    cap_usd: capUsd,
    ceiling_pct: pctCeiling,
    threshold_usd: Number(thresholdUsd.toFixed(4)),
    used_pct_of_cap: Number(((usedUsd / capUsd) * 100).toFixed(1)),
    halt: usedUsd >= thresholdUsd,
  };
}

// Per-application cost ceiling: a hard cap (no % margin — it's a per-item budget,
// not a safety buffer on a large pool). Halts once THIS application's total spend
// reaches per_application_cap_usd. Because cost is only known after a call
// returns, this blocks the *next* call once a job's budget is spent — it can't
// stop a single first call from overshooting, same limitation as every post-hoc
// budget here. Only evaluated when a jobId is supplied and a cap is configured.
function perApplicationCostStatus(jobId) {
  const capUsd = COST.per_application_cap_usd;
  if (!jobId || capUsd == null) {
    return { configured: false, job_id: jobId || null, used_usd: Number(costForApplication(jobId).toFixed(4)), halt: false };
  }
  const usedUsd = costForApplication(jobId);
  return {
    configured: true,
    job_id: jobId,
    used_usd: Number(usedUsd.toFixed(4)),
    cap_usd: capUsd,
    used_pct_of_cap: Number(((usedUsd / capUsd) * 100).toFixed(1)),
    halt: usedUsd >= capUsd,
  };
}

function check(jobId = "") {
  const block5h = windowStatus(usageSince(5), CFG.rolling_5h_block_limit_tokens, CFG.rolling_5h_block_pct);
  const weekly = windowStatus(usageSince(24 * 7), CFG.weekly_limit_tokens, CFG.weekly_pct);
  const monthlyCost = monthlyCostStatus();
  const perApp = perApplicationCostStatus(jobId);
  return {
    block_5h: block5h,
    weekly,
    monthly_cost: monthlyCost,
    per_application_cost: perApp,
    halt: block5h.halt || weekly.halt || monthlyCost.halt || perApp.halt,
  };
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
const cmd = process.argv[2];

if (cmd === "record") {
  const tokensIn = Number(arg("tokens-in") || 0);
  const tokensOut = Number(arg("tokens-out") || 0);
  const model = arg("model") || "unknown";
  const lane = arg("lane");
  const costUsd = Number(arg("cost-usd") || 0);
  const jobId = arg("job-id");
  if (!tokensIn && !tokensOut && !costUsd) {
    console.error("Provide --tokens-in and/or --tokens-out (and optionally --cost-usd)");
    process.exit(1);
  }
  record(tokensIn, tokensOut, model, lane, costUsd, jobId);
  console.log(JSON.stringify({ recorded: true, tokensIn, tokensOut, model, lane, costUsd, jobId: jobId || "" }));
} else if (cmd === "check") {
  console.log(JSON.stringify(check(arg("job-id") || ""), null, 2));
} else if (cmd === "gate") {
  const jobId = arg("job-id") || "";
  const status = check(jobId);
  console.log(JSON.stringify(status, null, 2));
  if (status.halt) {
    let why;
    if (status.per_application_cost.halt) {
      why = `per-application cost cap (job ${status.per_application_cost.job_id}: $${status.per_application_cost.used_usd} ≥ $${status.per_application_cost.cap_usd})`;
    } else if (status.monthly_cost.halt) {
      why = `monthly cost cap (${status.monthly_cost.used_pct_of_cap}% of $${status.monthly_cost.cap_usd}, ceiling ${status.monthly_cost.ceiling_pct}%)`;
    } else {
      why = "token budget ceiling (5h block / weekly)";
    }
    appendAudit({ actor: "token-budget", event: "budget.halt", result: "halted", jobId, detail: why });
    console.error(`\nHALTED: ${why} reached. Stop new Opus work and flag the user (post to #job-approvals once Slack wiring exists). Resume when the window rolls over.`);
    process.exit(1);
  }
  process.exit(0);
} else {
  console.error("Usage: node token-budget.mjs <record|check|gate> [options]");
  process.exit(1);
}
}
