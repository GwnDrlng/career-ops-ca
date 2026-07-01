#!/usr/bin/env node
// watcher/watch.mjs — polls #job-pipeline for graded reports posted by the
// cloud agent (RE_ARCHITECTURE.md Part 1, not yet built at the time this
// file was written), writes each into reports/{NNN}-{slug}-{date}.md via
// reserve-report-num.mjs, and hands off to route-tier.mjs for tier dispatch.
// Checkpoints the last-processed Slack message ts so restarts don't reprocess.
//
// Message contract expected from the cloud's post-to-slack.ts: either the
// full report Markdown (including `## Machine Summary`) as the message
// `text`, or a text/markdown file attachment containing the same. Whichever
// is present is used as-is; if both are present the file wins.
//
// Usage:
//   node watcher/watch.mjs                          # single poll, then exit
//   node watcher/watch.mjs --daemon                   # loop forever
//   node watcher/watch.mjs --daemon --interval 300     # poll every N seconds (default 300)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { channels, fetchHistorySince, postMessage, downloadFile } from "../pipeline/slack-client.mjs";
import { isPaused } from "../pipeline/kill-switch.mjs";
import { noteFailure, noteSuccess } from "../pipeline/dead-letter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const CHECKPOINT_PATH = path.join(__dirname, ".checkpoint.json");

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_PATH)) return { lastTs: "0" };
  return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: PROJECT_ROOT, encoding: "utf8" });
}

async function messageContent(message) {
  const mdFile = (message.files || []).find((f) => /\.(md|txt)$/i.test(f.name || ""));
  if (mdFile) return downloadFile(mdFile.url_private_download);
  return message.text || "";
}

function extractCompanySlug(content) {
  const machineSummary = content.match(/## Machine Summary\s*```yaml\n([\s\S]*?)```/);
  const companyLine = machineSummary?.[1].match(/company:\s*"?([^"\n]+)"?/);
  const titleLine = content.match(/^# Evaluation:\s*(.+?)\s*[—-]/m);
  const company = companyLine?.[1]?.trim() || titleLine?.[1]?.trim() || "unknown";
  return company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
}

function looksLikeReport(content) {
  return /^# Evaluation:/m.test(content) || /## Machine Summary/.test(content);
}

async function processMessage(message) {
  const content = await messageContent(message);
  if (!content.trim() || !looksLikeReport(content)) {
    console.log(`[watch] Skipping message ${message.ts} — not a graded report (no "# Evaluation:" header or Machine Summary block).`);
    return;
  }

  const reserved = JSON.parse(run("node", ["reserve-report-num.mjs"]).stdout);
  const slug = extractCompanySlug(content);
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(PROJECT_ROOT, "reports", `${reserved.number}-${slug}-${date}.md`);

  fs.writeFileSync(reportPath, content);
  run("node", ["reserve-report-num.mjs", "--release", reserved.number]);

  const routeResult = run("node", ["pipeline/route-tier.mjs", "--report", path.relative(PROJECT_ROOT, reportPath)]);
  let decision;
  try {
    decision = JSON.parse(routeResult.stdout);
  } catch {
    console.error(`[watch] route-tier.mjs failed for ${reportPath}:`, routeResult.stderr);
    return;
  }

  console.log(`[watch] ${decision.company} / ${decision.role} (score ${decision.score}) -> lane: ${decision.lane}${decision.reason ? ` (${decision.reason})` : ""}`);

  await postMessage(
    channels.jobPipeline,
    `*${decision.company}* — ${decision.role || "?"} — score ${decision.score}/5 -> *${decision.lane}*${decision.reason ? `\n> ${decision.reason}` : ""}`,
    { thread_ts: message.ts }
  ).catch((err) => console.error("[watch] Slack confirmation post failed (non-fatal):", err.message));
}

async function poll() {
  // Kill switch: while paused, don't ingest or route anything. The checkpoint is
  // left untouched so any messages posted during the pause are picked up on
  // resume rather than skipped.
  if (isPaused()) {
    console.log("[watch] Pipeline is paused (kill switch) — skipping poll. Resume with `node pipeline/kill-switch.mjs resume` or Slack `/resume`.");
    return;
  }
  const SKIP_SUBTYPES = new Set([
    "channel_join", "channel_leave", "channel_topic", "channel_purpose",
    "channel_name", "channel_archive", "channel_unarchive", "channel_pinned",
  ]);
  const cp = loadCheckpoint();
  const messages = await fetchHistorySince(channels.jobPipeline, cp.lastTs);
  const candidates = messages.filter((m) => !SKIP_SUBTYPES.has(m.subtype));
  if (!candidates.length) {
    console.log("[watch] No new messages.");
    if (messages.length) saveCheckpoint({ lastTs: messages[messages.length - 1].ts });
    return;
  }
  for (const message of candidates) {
    try {
      await processMessage(message);
      noteSuccess("watch", message.ts);
    } catch (err) {
      const dl = noteFailure("watch", message.ts, err.message, message.text || "");
      if (!dl.deadLettered) {
        // Transient (hopefully) — hold the queue and retry this message next poll.
        console.error(`[watch] message ${message.ts} failed (attempt ${dl.count}/${dl.maxRetries}), will retry:`, err.message);
        return;
      }
      // Poison message — recorded to the dead-letter ledger. Alert and advance
      // past it so the rest of the queue isn't blocked.
      console.error(`[watch] message ${message.ts} dead-lettered after ${dl.count} attempts:`, err.message);
      await postMessage(
        channels.jobPipeline,
        `⚠️ A report message could not be processed after ${dl.maxRetries} attempts and was moved to the dead-letter queue (see \`node pipeline/dead-letter.mjs list\`). Last error: ${err.message}`
      ).catch(() => {});
      // fall through to advance the checkpoint past the dead-lettered message
    }
    saveCheckpoint({ lastTs: message.ts });
  }
}

const daemon = process.argv.includes("--daemon");
const intervalIdx = process.argv.indexOf("--interval");
const intervalSeconds = intervalIdx !== -1 ? Number(process.argv[intervalIdx + 1]) : 300;

if (daemon) {
  console.log(`[watch] Starting daemon, polling every ${intervalSeconds}s. Ctrl+C to stop.`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await poll().catch((err) => console.error("[watch] Poll error:", err.message));
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
} else {
  await poll();
}
