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

export default defineTool({
  description: "Post a graded job report to the #job-pipeline Slack channel.",
  inputSchema: z.object({
    channelId: z.string().describe("Slack channel ID, e.g. C0123ABC"),
    text: z.string().describe("Full report Markdown to post"),
  }),
  async execute({ channelId, text }) {
    const { botToken } = await connectSlackCredentials(CONNECT_UID);
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: channelId, text }),
    });
    const body = (await res.json()) as { ok: boolean; ts?: string; error?: string };
    if (!body.ok) throw new Error(`Slack chat.postMessage failed: ${body.error}`);
    return { posted: true, ts: body.ts };
  },
  toModelOutput(output) {
    return { type: "text", value: output.posted ? `Posted to Slack (ts ${output.ts}).` : "Post failed." };
  },
});
