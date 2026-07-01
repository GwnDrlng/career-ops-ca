import { defineChannel, POST } from "eve/channels";
import { createHmac, timingSafeEqual } from "node:crypto";
import slack from "./slack.js";

// Slack slash-command endpoint. Slack POSTs application/x-www-form-urlencoded
// payloads here when someone runs a registered slash command. This channel is
// SEPARATE from channels/slack.ts (the Events API / bot at /eve/v1/slack) — a
// slash command is a distinct Slack feature with its own Request URL.
//
// SETUP (one-time):
//   1. In your Slack app (api.slack.com/apps) add a slash command:
//        Command: /scan
//        Request URL: https://<deployment>/slack/commands
//   NOTE: eve mounts a custom channel route at its literal path with no
//   /eve/v1/<channel> prefix, so the route below IS the full URL path.
//   2. Copy the app's "Signing Secret" (Basic Information → App Credentials) and
//      set it on Vercel:  vercel env add SLACK_SIGNING_SECRET production
//      Redeploy so the function picks it up.
//
// SCOPE: only /scan is handled here. /pause, /resume and approve <token> control
// on-prem submit authority and are deliberately NOT routed through the cloud —
// they stay on-prem (watcher/approval-consumer.mjs) so submit authority never
// leaves the laptop and "message author == verified approver" stays enforceable.
const JOB_PIPELINE_CHANNEL_ID = "C0BF4H3V280"; // keep in sync with guardrails slack.job_pipeline_channel_id
const MAX_SKEW_SECONDS = 60 * 5; // reject replays older than 5 minutes

// Verify Slack's request signature (api.slack.com/authentication/verifying-requests-from-slack).
function verifySlackSignature(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    console.error("[slack-commands] SLACK_SIGNING_SECRET is not set — rejecting.");
    return false;
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;
  const expected = "v0=" + createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Slack shows this text to the invoker as an immediate ephemeral ack.
function ephemeral(text: string): Response {
  return Response.json({ response_type: "ephemeral", text });
}

export default defineChannel({
  routes: [
    POST("/slack/commands", async (req, args) => {
      const rawBody = await req.text();
      const timestamp = req.headers.get("x-slack-request-timestamp") || "";
      const signature = req.headers.get("x-slack-signature") || "";

      if (!verifySlackSignature(rawBody, timestamp, signature)) {
        return new Response("invalid signature", { status: 401 });
      }

      const form = new URLSearchParams(rawBody);
      const command = (form.get("command") || "").trim();
      const userId = form.get("user_id") || "";

      if (command !== "/scan") {
        return ephemeral(`Unsupported command \`${command}\`. Only \`/scan\` is handled here. Use plain-text \`pause\`/\`resume\`/\`approve <token>\` in #job-approvals for pipeline control.`);
      }

      // Slack requires a response within 3s. Ack immediately; run the scan in the
      // background (waitUntil keeps the function alive until the handoff settles).
      args.waitUntil(
        args.receive(slack, {
          message:
            "Run the daily job scan and grading pipeline now, following your instructions.md state machine: " +
            "scan portals, grade each new posting, format each into a report, and post every graded report to " +
            "this channel. If there are no new postings, finish without posting anything. " +
            `On-demand run triggered from Slack /scan by <@${userId}>.`,
          target: { channelId: JOB_PIPELINE_CHANNEL_ID },
          auth: { authenticator: "app", principalId: "eve:app", principalType: "runtime", attributes: {} },
        }),
      );

      return ephemeral("🔎 Scan started — graded reports will post to #job-pipeline as they're ready.");
    }),
  ],
});
