import { defineTool } from "eve/tools";
import { z } from "zod";
import { connectSlackCredentials } from "@vercel/connect/eve";

// Posts the fully-formatted report text directly via the Slack Web API,
// using the same Vercel Connect-managed bot token as channels/slack.ts.
// Deliberately NOT routed through eve's receive()/channel session
// abstraction: receive() starts an agent conversation turn anchored to a
// channel, which is the right tool when you want the model to converse in
// Slack, but this tool just needs to post a fully-formed report verbatim,
// with no further model involvement. Same Connect UID as the channel file,
// see agent/channels/slack.ts.
const CONNECT_UID = "slack/career-ops";

// The #job-pipeline channel ID. This is baked in (overridable via env) so the
// MODEL never has to know, supply, or guess a channel ID — earlier runs either
// guessed wrong (channel_not_found) or stalled asking the user for the ID.
// Keep in sync with config/guardrails.yml slack.job_pipeline_channel_id.
const JOB_PIPELINE_CHANNEL_ID = process.env.JOB_PIPELINE_CHANNEL_ID ?? "C0BF4H3V280";

// Uploads `content` as a .md file attachment to the channel, with `comment`
// as the message body, via Slack's external-upload flow (getUploadURLExternal
// → PUT bytes → completeUploadExternal). This is what keeps #job-pipeline
// human-readable: the reader sees the compact header comment, while the full
// Block A-G report rides along as a collapsed file. The on-prem watcher
// (watcher/watch.mjs) prefers the file over the message text, so it still
// reconstructs the complete report. Returns the posted message ts.
async function uploadReportFile(token: string, channel: string, fileName: string, content: string, comment: string) {
  const length = Buffer.byteLength(content, "utf8");
  const getUrl = new URL("https://slack.com/api/files.getUploadURLExternal");
  getUrl.searchParams.set("filename", fileName);
  getUrl.searchParams.set("length", String(length));
  const getRes = (await (
    await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { ok: boolean; upload_url?: string; file_id?: string; error?: string };
  if (!getRes.ok || !getRes.upload_url || !getRes.file_id) {
    throw new Error(`Slack files.getUploadURLExternal failed: ${getRes.error ?? "no upload_url"}`);
  }

  const putRes = await fetch(getRes.upload_url, {
    method: "POST",
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
    body: content,
  });
  if (!putRes.ok) throw new Error(`Slack file upload POST failed: ${putRes.status}`);

  const completeRes = (await (
    await fetch("https://slack.com/api/files.completeUploadExternal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        files: [{ id: getRes.file_id, title: fileName }],
        channel_id: channel,
        initial_comment: comment,
      }),
    })
  ).json()) as { ok: boolean; files?: Array<{ timestamp?: string }>; error?: string };
  if (!completeRes.ok) throw new Error(`Slack files.completeUploadExternal failed: ${completeRes.error}`);
  return { ts: completeRes.files?.[0]?.timestamp };
}

async function postText(token: string, channel: string, text: string) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, text }),
  });
  const body = (await res.json()) as { ok: boolean; ts?: string; error?: string };
  if (!body.ok) throw new Error(`Slack chat.postMessage failed: ${body.error}`);
  return { ts: body.ts };
}

export default defineTool({
  description:
    "Post a graded job report to the #job-pipeline Slack channel. Always posts to " +
    "#job-pipeline automatically — do NOT ask for or supply a channel ID; omit channelId. " +
    "Pass the compact header (format_report's `slackText`) as `text`, and the full report " +
    "(format_report's `markdown`) as `report` so it's attached as a file, keeping the channel " +
    "readable while the on-prem watcher still gets the complete report.",
  inputSchema: z.object({
    channelId: z
      .string()
      .optional()
      .describe("Optional Slack channel ID override. Leave unset to post to #job-pipeline (the default)."),
    text: z.string().describe("Compact message body to show in the channel (format_report's `slackText`)."),
    report: z
      .string()
      .optional()
      .describe(
        "Full report Markdown (format_report's `markdown`), attached as a .md file for the on-prem watcher. " +
          "Omit for non-report status pings (e.g. the empty-scan trace), where `text` is the whole message.",
      ),
  }),
  async execute({ channelId, text, report }) {
    const targetChannel = channelId ?? JOB_PIPELINE_CHANNEL_ID;
    const { botToken } = connectSlackCredentials(CONNECT_UID);
    if (!botToken) throw new Error("Slack credentials missing botToken");
    const token = typeof botToken === "function" ? await botToken() : botToken;

    // Plain status ping (no report to attach): post the text as-is.
    if (!report) {
      const { ts } = await postText(token, targetChannel, text);
      return { posted: true, ts };
    }

    // Report post: compact header as the message, full report as an attached
    // file. The managed Vercel Connect connector's scopes are fixed by Vercel's
    // Slack app and don't include files:write, so the file upload runs on the
    // career-ops-ca bot token (SLACK_BOT_TOKEN — the on-prem app, which has
    // files:write) when present, falling back to the Connect token otherwise.
    // If the upload still fails (no scope), we post the full report inline so
    // the watcher never loses data — verbose, but the pre-attachment behavior.
    const uploadToken = process.env.SLACK_BOT_TOKEN ?? token;
    const fileName = `${text.match(/^# Evaluation:\s*(.+)$/m)?.[1]?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "report"}.md`;
    try {
      const { ts } = await uploadReportFile(uploadToken, targetChannel, fileName, report, text);
      return { posted: true, ts };
    } catch (err) {
      console.error(`[post_to_slack] file upload failed, falling back to inline text: ${(err as Error).message}`);
      const { ts } = await postText(token, targetChannel, report);
      return { posted: true, ts };
    }
  },
  toModelOutput(output) {
    return { type: "text", value: output.posted ? `Posted to Slack (ts ${output.ts}).` : "Post failed." };
  },
});
