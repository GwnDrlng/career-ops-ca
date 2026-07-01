#!/usr/bin/env node
// test-slash.mjs — verify the deployed /scan slash-command endpoint end to end
// WITHOUT going through Slack and WITHOUT triggering a real scan.
//
// It signs a request exactly the way Slack does (v0 HMAC-SHA256 over
// `v0:{timestamp}:{body}` with your Slack app's Signing Secret) and POSTs it to
// the live endpoint. By default it sends a dummy command, so a correct secret
// returns the endpoint's "Unsupported command" ack (HTTP 200) — proving
// signature verification passes — but no scan runs.
//
// Usage:
//   SLACK_SIGNING_SECRET=... node test-slash.mjs            # safe: dummy command, no scan
//   SLACK_SIGNING_SECRET=... node test-slash.mjs --real     # actually fires /scan
//   node test-slash.mjs --secret <signing-secret> [--url https://...]
//
// Interpreting the result:
//   HTTP 200 + "Unsupported command"  -> secret is correct & deployed. ✅
//   HTTP 200 + "Scan started"         -> (--real) full path works. ✅
//   HTTP 401 "invalid signature"      -> secret wrong, OR not redeployed since `vercel env add`.
//   HTTP 404                          -> wrong URL/path (should be {deployment}/slack/commands).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const secret = arg("secret") || process.env.SLACK_SIGNING_SECRET;
if (!secret) {
  console.error("Need the Slack app Signing Secret. Set $SLACK_SIGNING_SECRET or pass --secret <value>.");
  process.exit(1);
}

const guardrails = yaml.load(fs.readFileSync(path.join(__dirname, "config/guardrails.yml"), "utf8"));
const base = (arg("url") || guardrails?.cloud?.deployment_url || "").replace(/\/$/, "");
const slashPath = guardrails?.cloud?.slash_command_path || "/slack/commands";
if (!base) { console.error("No deployment URL (config/guardrails.yml cloud.deployment_url or --url)."); process.exit(1); }
const endpoint = base + slashPath;

const real = process.argv.includes("--real");
const command = real ? "/scan" : "/scan-selftest";

// Build a Slack-style form body + signature.
const params = new URLSearchParams({
  token: "test", team_id: "T000", team_domain: "test",
  channel_id: "C0BF4H3V280", channel_name: "job-pipeline",
  user_id: "U0BF4GVPKHN", user_name: "selftest",
  command, text: "", api_app_id: "A000",
  response_url: "https://hooks.slack.com/commands/test",
  trigger_id: "0.0.0",
});
const body = params.toString();
const ts = Math.floor(Date.now() / 1000).toString();
const sig = "v0=" + createHmac("sha256", secret).update(`v0:${ts}:${body}`).digest("hex");

console.log(`POST ${endpoint}  (command=${command}${real ? " — REAL scan" : " — dummy, no scan"})`);

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Slack-Request-Timestamp": ts,
    "X-Slack-Signature": sig,
  },
  body,
}).catch((e) => { console.error("Request failed:", e.message); process.exit(1); });

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text);

if (res.status === 200) {
  console.log(real ? "\n✅ Signature accepted and /scan fired — check #job-pipeline." : "\n✅ Signature verified — the secret is correct and deployed. Run with --real to fire an actual scan (or just type /scan in Slack).");
} else if (res.status === 401) {
  console.log("\n❌ Rejected. Either the secret doesn't match the Slack app, or you haven't redeployed since `vercel env add SLACK_SIGNING_SECRET`.");
} else if (res.status === 404) {
  console.log("\n❌ Wrong path. Expected {deployment}/slack/commands.");
}
process.exit(res.status === 200 ? 0 : 1);
