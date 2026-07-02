// slack-client.mjs — thin Slack Web API wrapper for the watcher.
// Bot token is read from macOS Keychain at call time, never stored in a file
// or environment variable. See config/guardrails.yml `slack.keychain_service`.

import { execSync } from "node:child_process";
import fs from "node:fs";
import yaml from "js-yaml";

const guardrails = yaml.load(fs.readFileSync("config/guardrails.yml", "utf8"));
const SLACK = guardrails.slack;

let cachedToken = null;
function getToken() {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = execSync(
      `security find-generic-password -a "$USER" -s "${SLACK.keychain_service}" -w`,
      { encoding: "utf8" }
    ).trim();
  } catch {
    throw new Error(
      `Slack bot token not found in Keychain (service "${SLACK.keychain_service}"). ` +
      `Run: security add-generic-password -a "$USER" -s "${SLACK.keychain_service}" -w "xoxb-..." -U`
    );
  }
  if (!cachedToken) throw new Error("Keychain returned an empty Slack token.");
  return cachedToken;
}

async function call(method, body) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Slack API ${method} failed: ${json.error}`);
  return json;
}

export const channels = {
  jobPipeline: SLACK.job_pipeline_channel_id,
  jobApprovals: SLACK.job_approvals_channel_id,
};

export async function postMessage(channelId, text, extra = {}) {
  return call("chat.postMessage", { channel: channelId, text, ...extra });
}

export async function fetchHistorySince(channelId, oldestTs) {
  // conversations.history is a GET endpoint (unlike chat.postMessage), so it
  // needs query params rather than a JSON body — call fetch directly.
  const params = new URLSearchParams({ channel: channelId, oldest: oldestTs || "0", limit: "200" });
  const res = await fetch(`https://slack.com/api/conversations.history?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const parsed = await res.json();
  if (!parsed.ok) throw new Error(`Slack API conversations.history failed: ${parsed.error}`);
  // Slack returns newest-first; callers want chronological order.
  return parsed.messages.slice().reverse();
}

export async function downloadFile(fileUrlPrivate) {
  const res = await fetch(fileUrlPrivate, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`Failed to download Slack file: ${res.status}`);
  return res.text();
}
