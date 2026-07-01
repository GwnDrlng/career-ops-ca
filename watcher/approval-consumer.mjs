#!/usr/bin/env node
// watcher/approval-consumer.mjs — the on-prem half of the Part 7D approval gate
// and the Slack-driven kill switch. Polls #job-approvals (the private,
// restricted-membership channel) for three control messages from a verified
// approver:
//
//   /pause [reason]     -> trip the kill switch (halts all lanes)
//   /resume             -> clear the kill switch
//   approve <token>     -> authorize the matching filled form for submission
//
// The consumer never decides on its own to submit. On `approve <token>` it hands
// off to `applier.mjs --submit`, which independently re-verifies + burns the
// single-use token, re-runs every pre-submit gate, and only then clicks submit.
// Verified-approver identity is enforced twice: here (cheap pre-check on the
// Slack `user` id) and again inside verifyAndConsume() — a spoofed --approver
// can't get past the second check because it re-reads the same allowlist.
//
// Usage:
//   node watcher/approval-consumer.mjs                  # single poll, then exit
//   node watcher/approval-consumer.mjs --daemon          # loop
//   node watcher/approval-consumer.mjs --daemon --interval 60

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { channels, fetchHistorySince, postMessage } from "../pipeline/slack-client.mjs";
import { pause, resume, pauseUntil, nextDailyCronISO } from "../pipeline/kill-switch.mjs";
import { getRequest, isVerifiedApprover, expireStale } from "../pipeline/approval.mjs";
import { noteFailure, noteSuccess } from "../pipeline/dead-letter.mjs";
import { grantOverride, deferOverride } from "../pipeline/budget-override.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const CHECKPOINT_PATH = path.join(__dirname, ".approval-checkpoint.json");

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_PATH)) return { lastTs: "0" };
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
  } catch {
    return { lastTs: "0" };
  }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

async function reply(text, thread_ts) {
  await postMessage(channels.jobApprovals, text, thread_ts ? { thread_ts } : {}).catch(
    (err) => console.error("[approval] Slack reply failed (non-fatal):", err.message)
  );
}

async function handleControl(message) {
  const text = (message.text || "").trim();
  const user = message.user;

  const pauseMatch = text.match(/^\/pause\b\s*(.*)$/i);
  const resumeMatch = /^\/resume\b/i.test(text);
  const approveMatch = text.match(/^approve\s+([a-f0-9]{16,})\b/i);
  const overrideMatch = text.match(/^budget-override\s+([a-f0-9]{16,})\b/i);
  const deferMatch = text.match(/^budget-defer(?:\s+([a-f0-9]{16,}))?\b/i);

  if (!pauseMatch && !resumeMatch && !approveMatch && !overrideMatch && !deferMatch) return; // ordinary chatter

  // Every control action requires a verified approver. An unverified user's
  // command is refused loudly so it's obvious it did nothing.
  if (!isVerifiedApprover(user)) {
    await reply(`<@${user}> is not a verified approver — command ignored. (Add their Slack id to approval.verified_approver_ids.)`, message.ts);
    return;
  }

  if (pauseMatch) {
    const reason = pauseMatch[1].trim() || "Slack /pause";
    pause(reason, user);
    await reply(`⏸ Pipeline *paused* by <@${user}>${pauseMatch[1].trim() ? ` — ${pauseMatch[1].trim()}` : ""}. All lanes halted. Send \`/resume\` to continue.`, message.ts);
    return;
  }

  if (resumeMatch) {
    resume(user);
    await reply(`▶️ Pipeline *resumed* by <@${user}>. Failure streak cleared.`, message.ts);
    return;
  }

  if (approveMatch) {
    const token = approveMatch[1];
    const request = getRequest(token);
    if (!request) {
      await reply(`Unknown approval token \`${token}\` — nothing to submit.`, message.ts);
      return;
    }
    if (request.status !== "pending") {
      await reply(`Token \`${token}\` is *${request.status}*, not pending — cannot submit again.`, message.ts);
      return;
    }
    await reply(`Authorizing submission for *${request.company}* — ${request.role}…`, message.ts);
    const result = spawnSync("node", [
      "pipeline/applier.mjs", "--submit",
      "--token", token,
      "--approver", user,
      ...(request.reportPath ? ["--report", request.reportPath] : []),
    ], { cwd: PROJECT_ROOT, encoding: "utf8" });
    // applier posts its own success/failure message to the channel; surface any
    // hard crash here so a silent spawn failure doesn't look like success.
    if (result.status !== 0 && result.stderr) {
      await reply(`Submit process for \`${token}\` exited with an error:\n\`\`\`${result.stderr.slice(0, 500)}\`\`\``, message.ts);
    }
    return;
  }

  if (overrideMatch) {
    const token = overrideMatch[1];
    const verdict = grantOverride({ token, approverUserId: user });
    if (verdict.granted) {
      const r = verdict.record;
      await reply(
        `✅ Budget override granted by <@${user}> — the next ${r.callsRemaining} Opus call(s)${r.jobId ? ` for job ${r.jobId}` : ""} will proceed despite the ceiling (${r.which}).`,
        message.ts
      );
    } else {
      await reply(`Budget override rejected: ${verdict.reason}`, message.ts);
    }
    return;
  }

  if (deferMatch) {
    const token = deferMatch[1]; // optional — a defer is a pipeline-wide pause
    if (token) deferOverride(token, user); // retire the halt's override request, if any
    const resumeAt = nextDailyCronISO();
    pauseUntil("budget-defer", resumeAt, user);
    await reply(
      `⏸ Pipeline *deferred* by <@${user}> — all lanes paused until the next daily run (${resumeAt}), then auto-resume. Send \`/resume\` to restart sooner.`,
      message.ts
    );
  }
}

async function poll() {
  expireStale();
  const cp = loadCheckpoint();
  const messages = await fetchHistorySince(channels.jobApprovals, cp.lastTs);
  // Ignore the bot's own posts and channel system messages — only act on human
  // commands.
  const candidates = messages.filter((m) => !m.bot_id && m.subtype !== "bot_message" && m.user);
  if (!candidates.length) {
    if (messages.length) saveCheckpoint({ lastTs: messages[messages.length - 1].ts });
    else console.log("[approval] No new messages.");
    return;
  }
  for (const message of candidates) {
    try {
      await handleControl(message);
      noteSuccess("approval", message.ts);
    } catch (err) {
      const dl = noteFailure("approval", message.ts, err.message, message.text || "");
      if (!dl.deadLettered) {
        console.error(`[approval] message ${message.ts} failed (attempt ${dl.count}/${dl.maxRetries}), will retry:`, err.message);
        return; // hold the queue and retry next poll
      }
      console.error(`[approval] message ${message.ts} dead-lettered after ${dl.count} attempts:`, err.message);
      await postMessage(
        channels.jobApprovals,
        `⚠️ A control message could not be processed after ${dl.maxRetries} attempts and was moved to the dead-letter queue. Last error: ${err.message}`
      ).catch(() => {});
      // advance past the dead-lettered message
    }
    saveCheckpoint({ lastTs: message.ts });
  }
}

const daemon = process.argv.includes("--daemon");
const intervalIdx = process.argv.indexOf("--interval");
const intervalSeconds = intervalIdx !== -1 ? Number(process.argv[intervalIdx + 1]) : 60;

if (daemon) {
  console.log(`[approval] Starting daemon, polling #job-approvals every ${intervalSeconds}s. Ctrl+C to stop.`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await poll().catch((err) => console.error("[approval] Poll error:", err.message));
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
} else {
  await poll();
}
