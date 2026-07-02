#!/usr/bin/env node
// scan-now.mjs — trigger the cloud daily-scan pipeline on demand, outside the
// 12:00 UTC cron. Starts a session on the deployed eve agent's canonical HTTP
// route (POST /eve/v1/session), authenticated with the project's Vercel OIDC
// token (the same token vercelOidc() accepts in cloud/agent/channels/eve.ts).
// The agent then runs its instructions.md scan/grade state machine and posts
// graded reports to #job-pipeline exactly as the scheduled run does.
//
// Usage:
//   node scan-now.mjs                 # trigger a scan now
//   node scan-now.mjs --dry-run       # print what would be sent, send nothing
//   node scan-now.mjs --url https://... [--message "..."]
//
// Resolution order:
//   deployment URL  : --url  >  $CAREER_OPS_CLOUD_URL  >  guardrails cloud.deployment_url
//   OIDC token      : $VERCEL_OIDC_TOKEN  >  cloud/.env.local (VERCEL_OIDC_TOKEN=...)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes("--dry-run");

const DEFAULT_MESSAGE =
  "Run the daily job scan and grading pipeline now, following your instructions.md state machine: " +
  "scan portals, grade each new posting, format each into a report, and post every graded report to " +
  "#job-pipeline. If there are no new postings, finish without posting anything. " +
  "This is an on-demand run triggered outside the daily cron.";

function resolveUrl() {
  const fromArg = arg("url");
  if (fromArg) return fromArg.replace(/\/$/, "");
  if (process.env.CAREER_OPS_CLOUD_URL) return process.env.CAREER_OPS_CLOUD_URL.replace(/\/$/, "");
  const guardrails = yaml.load(fs.readFileSync(path.join(__dirname, "config/guardrails.yml"), "utf8"));
  const url = guardrails?.cloud?.deployment_url;
  if (!url) {
    console.error("No deployment URL. Set cloud.deployment_url in config/guardrails.yml, $CAREER_OPS_CLOUD_URL, or pass --url.");
    process.exit(1);
  }
  return url.replace(/\/$/, "");
}

function resolveToken() {
  if (process.env.VERCEL_OIDC_TOKEN) return process.env.VERCEL_OIDC_TOKEN;
  const envLocal = path.join(__dirname, "cloud", ".env.local");
  if (fs.existsSync(envLocal)) {
    const m = fs.readFileSync(envLocal, "utf8").match(/^VERCEL_OIDC_TOKEN=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  console.error(
    "No Vercel OIDC token. It's short-lived — refresh it with:\n" +
    "  (cd cloud && vercel env pull .env.local)   # or re-run `vercel link`\n" +
    "then retry. Or export VERCEL_OIDC_TOKEN=... yourself."
  );
  process.exit(1);
}

const url = resolveUrl();
const message = arg("message") || DEFAULT_MESSAGE;
const endpoint = `${url}/eve/v1/session`;

if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, endpoint, body: { message } }, null, 2));
  process.exit(0);
}

const token = resolveToken();

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ message }),
}).catch((err) => {
  console.error(`Request to ${endpoint} failed:`, err.message);
  process.exit(1);
});

const bodyText = await res.text();
let body;
try {
  body = JSON.parse(bodyText);
} catch {
  body = bodyText;
}

if (!res.ok) {
  console.error(`Cloud agent returned ${res.status}:`, body);
  if (res.status === 401) {
    console.error("→ 401 usually means the OIDC token expired. Refresh it: (cd cloud && vercel env pull .env.local)");
  }
  process.exit(1);
}

console.log("Scan triggered. The agent will post graded reports to #job-pipeline as it finishes.");
console.log(JSON.stringify(body, null, 2));
