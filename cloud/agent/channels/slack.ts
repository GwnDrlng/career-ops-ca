import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

// Setup (run once, from this directory, after `vercel link`):
//
//   npm install -g vercel@latest && export FF_CONNECT_ENABLED=1
//   vercel connect create slack --triggers
//   vercel connect detach slack/career-ops --yes
//   vercel connect attach slack/career-ops --triggers --trigger-path /eve/v1/slack --yes
//
// See node_modules/eve/docs/channels/slack.mdx for the full walkthrough.
// The UID "slack/career-ops" must match agent/tools/post_to_slack.ts.
export default slackChannel({
  credentials: connectSlackCredentials("slack/career-ops"),
});
