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

export default defineTool({
  description:
    "Post a graded job report to the #job-pipeline Slack channel. Always posts to " +
    "#job-pipeline automatically — do NOT ask for or supply a channel ID; omit channelId.",
  inputSchema: z.object({
    channelId: z
      .string()
      .optional()
      .describe("Optional Slack channel ID override. Leave unset to post to #job-pipeline (the default)."),
    text: z.string().describe("Full report Markdown to post"),
  }),
  async execute({ channelId, text }) {
    const targetChannel = channelId ?? JOB_PIPELINE_CHANNEL_ID;
    const { botToken } = connectSlackCredentials(CONNECT_UID);
    if (!botToken) throw new Error("Slack credentials missing botToken");
    const token = typeof botToken === "function" ? await botToken() : botToken;
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: targetChannel, text }),
    });
    const body = (await res.json()) as { ok: boolean; ts?: string; error?: string };
    if (!body.ok) throw new Error(`Slack chat.postMessage failed: ${body.error}`);
    return { posted: true, ts: body.ts };
  },
  toModelOutput(output) {
    return { type: "text", value: output.posted ? `Posted to Slack (ts ${output.ts}).` : "Post failed." };
  },
});
