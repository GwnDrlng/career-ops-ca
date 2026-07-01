// opus-call.mjs — shared wrapper for spawning a separate Opus 4.8 `claude -p`
// process, gated by token-budget.mjs and recorded to its ledger. Used by
// judge.mjs and grounding-check.mjs so both respect the same budget ceilings
// without duplicating the gate/record/parse logic.

import { spawnSync } from "node:child_process";
import { channels, postMessage } from "./slack-client.mjs";
import { appendAudit } from "./audit.mjs";
import { getConfig, ensurePendingRequest, consumeActiveGrant } from "./budget-override.mjs";

const MODEL = "claude-opus-4-8";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Summarize which ceiling a token-budget halt tripped, for the Slack message.
function summarizeHalt(status) {
  if (status?.per_application_cost?.halt) {
    const p = status.per_application_cost;
    return `per-application cost cap (job ${p.job_id}: $${p.used_usd} ≥ $${p.cap_usd})`;
  }
  if (status?.monthly_cost?.halt) {
    const m = status.monthly_cost;
    return `monthly cost cap (${m.used_pct_of_cap}% of $${m.cap_usd}, ceiling ${m.ceiling_pct}%)`;
  }
  if (status?.block_5h?.halt) return "rolling 5-hour token block";
  if (status?.weekly?.halt) return "weekly token allowance";
  return "token/cost budget ceiling";
}

// Resolve a budget halt via the manual override path. Returns true if an override
// lets this call proceed, false if it stays halted. Consumes an already-granted
// override immediately; otherwise posts a Slack override request (once per scope)
// and, if budget_override.wait_seconds > 0, blocks up to that long waiting for a
// verified approver to grant it.
async function resolveBudgetHalt(jobId, status) {
  if (consumeActiveGrant(jobId)) return true; // already approved (e.g. earlier call)

  const which = summarizeHalt(status);
  const { record, isNew } = ensurePendingRequest({ which, detail: which, jobId });
  const cfg = getConfig();

  if (isNew) {
    await postMessage(
      channels.jobApprovals,
      `⛔️ *Budget halt* — ${which}.\n` +
      `This blocked an Opus call${jobId ? ` for job ${jobId}` : ""}. A verified approver can reply:\n` +
      `• \`budget-override ${record.token}\` — continue anyway (up to ${cfg.grantCalls} more call(s)${jobId ? ` for job ${jobId}` : ""} · expires ${cfg.expiryHours}h · bounded, audited overspend).\n` +
      `• \`budget-defer ${record.token}\` — stop the whole pipeline until the next daily run, then auto-resume.`
    ).catch(() => {});
  }

  const deadline = Date.now() + cfg.waitSeconds * 1000;
  while (Date.now() < deadline) {
    await sleep(Math.min(5000, cfg.waitSeconds * 1000));
    if (consumeActiveGrant(jobId)) return true;
  }
  return false;
}

export function tokenGate(jobId = "") {
  const gateArgs = ["pipeline/token-budget.mjs", "gate"];
  if (jobId) gateArgs.push("--job-id", jobId);
  const result = spawnSync("node", gateArgs, { encoding: "utf8" });
  if (result.status !== 0) {
    let status;
    try {
      status = JSON.parse(result.stdout);
    } catch {
      status = { halt: true, reason: "token-budget.mjs gate check failed to run" };
    }
    return { halted: true, status };
  }
  return { halted: false, status: JSON.parse(result.stdout) };
}

export async function callOpus(prompt, lane, opts = {}) {
  const jobId = opts.jobId || "";
  const gate = tokenGate(jobId);
  if (gate.halted) {
    // A ceiling was hit. Offer the manual override path before giving up.
    const overridden = await resolveBudgetHalt(jobId, gate.status);
    if (!overridden) {
      return {
        ok: false,
        haltedByBudget: true,
        status: gate.status,
      };
    }
    // override granted + consumed → fall through and make the call
  }

  const result = spawnSync("claude", ["-p", prompt, "--model", MODEL, "--output-format", "json"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    return { ok: false, haltedByBudget: false, error: result.stderr || result.error?.message || "claude -p failed" };
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return { ok: false, haltedByBudget: false, error: `Could not parse claude -p JSON output: ${result.stdout}` };
  }

  const usage = parsed.usage || {};
  const tokensIn = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
  const tokensOut = usage.output_tokens || 0;
  const costUsd = parsed.total_cost_usd || 0;

  const recordArgs = [
    "pipeline/token-budget.mjs", "record",
    "--tokens-in", String(tokensIn),
    "--tokens-out", String(tokensOut),
    "--model", MODEL,
    "--lane", lane || "unknown",
    "--cost-usd", String(costUsd),
  ];
  if (jobId) recordArgs.push("--job-id", jobId);
  spawnSync("node", recordArgs, { encoding: "utf8" });

  return { ok: true, text: parsed.result, usage: { tokensIn, tokensOut }, costUsd: parsed.total_cost_usd };
}
