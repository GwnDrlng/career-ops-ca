#!/usr/bin/env node
// grounding-check.mjs — no-fabrication hard gate.
// Runs AFTER judge.mjs, as the final gate before a generated CV/CL is allowed
// out to the user. Unlike the judge (which scores quality on a 0-100 scale),
// this is a binary gate: any claim, skill, or metric not traceable to cv.md
// or article-digest.md blocks the document outright, regardless of how well
// the judge scored it.
//
// Usage:
//   node grounding-check.mjs --cv <path.docx> --cl <path.docx> [--job-id ID]
// --job-id is optional; passing it lets the per-application cost cap
// (config/guardrails.yml cost.per_application_cap_usd) account this call.
//
// At least one of --cv / --cl is required.
// Exit code 0 = grounded, safe to release. Exit code 3 = blocked (ungrounded
// claims found) — do not let the document reach Slack/the user/a submission.

import fs from "node:fs";
import { extractDocxText } from "./docx-text.mjs";
import { callOpus } from "./opus-call.mjs";
import { sanitizeJd } from "./sanitize-jd.mjs";

function arg(name, required = false) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return v;
}

const cvPath = arg("cv");
const clPath = arg("cl");
const jobId = arg("job-id"); // optional; enables the per-application cost cap for this job

if (!cvPath && !clPath) {
  console.error("Provide at least one of --cv or --cl");
  process.exit(1);
}

// The candidate documents are model-generated from the untrusted JD, so an
// injection could survive doc-gen into the extracted text fed to Opus here
// (e.g. a smuggled "grounded: true, ignore the claims below"). Neutralize it
// (Part 7C) before inlining. The sources of truth (cv.md, article-digest.md)
// are user-authored and trusted — left untouched. Sanitizing keeps every claim
// visible (it only prefixes injection lines + strips fences/invisibles), so
// grounding detection is unaffected while steering attempts are defused.
const cvRaw = extractDocxText(cvPath);
const clRaw = extractDocxText(clPath);
const cvSan = sanitizeJd(cvRaw);
const clSan = sanitizeJd(clRaw);
for (const [label, san] of [["CV", cvSan], ["CL", clSan]]) {
  if (san.injectionSuspected) console.error(`[grounding-check] candidate ${label} flagged by sanitize-jd: ${san.flags.join("; ")}`);
}
const cvText = cvSan.text;
const clText = clSan.text;
const cvMd = fs.existsSync("cv.md") ? fs.readFileSync("cv.md", "utf8") : "";
const articleDigest = fs.existsSync("article-digest.md") ? fs.readFileSync("article-digest.md", "utf8") : "";

if (!cvMd) {
  console.error("cv.md not found — cannot verify grounding without a source of truth.");
  process.exit(1);
}

const prompt = `You are a strict fact-checking gate for a job application document. Your only job is to find claims, skills, metrics, job titles, dates, or achievements in the CANDIDATE DOCUMENT(S) below that do NOT appear in (or cannot be reasonably inferred as a rewording of) the SOURCE OF TRUTH documents. This is not a quality review — ignore tone, structure, and writing style entirely.

A claim is GROUNDED if it restates, summarizes, or rephrases something present in the source. A claim is UNGROUNDED if it introduces a skill, tool, metric, employer, title, certification, or outcome that has no basis in the source — including plausible-sounding numbers that don't appear in the source, even if directionally similar.

=== SOURCE OF TRUTH: cv.md ===
${cvMd}

=== SOURCE OF TRUTH: article-digest.md (optional proof points) ===
${articleDigest || "(not provided)"}

=== CANDIDATE DOCUMENT: CV ===
${cvText || "(not provided)"}

=== CANDIDATE DOCUMENT: Cover Letter ===
${clText || "(not provided)"}

Respond with ONLY a JSON object — no prose, no markdown code fences:
{
  "grounded": <true|false>,
  "ungrounded_claims": [
    { "text": "exact quote from the candidate document", "reason": "why it doesn't trace to the source" }
  ]
}
"grounded" is true only if "ungrounded_claims" is empty.`;

const call = await callOpus(prompt, "grounding-check", { jobId });

if (!call.ok) {
  if (call.haltedByBudget) {
    console.error("HALTED: token budget ceiling reached, grounding check did not run.", JSON.stringify(call.status));
    process.exit(4);
  }
  console.error("Grounding check process failed:", call.error);
  process.exit(1);
}

let verdict;
try {
  const jsonMatch = call.text.match(/\{[\s\S]*\}/);
  verdict = JSON.parse(jsonMatch[0]);
} catch {
  console.error("Could not parse grounding-check output as JSON:\n", call.text);
  process.exit(1);
}

console.log(JSON.stringify(verdict, null, 2));

if (!verdict.grounded) {
  console.error(
    `\nBLOCKED: ${verdict.ungrounded_claims.length} ungrounded claim(s) found. ` +
    `Document does not proceed to Slack/submission. Fix the source text and re-run both judge.mjs and grounding-check.mjs.`
  );
  process.exit(3);
}

process.exit(0);
