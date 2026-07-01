#!/usr/bin/env node
// judge.mjs — separate Opus 4.8 process that blind-scores generated CV/CL docs.
// "Separate" means: this process has no shared context with whatever generated
// the documents. It only sees the extracted document text, the JD, and cv.md
// as ground truth — never the writer's reasoning or prompt history.
//
// Usage:
//   node judge.mjs --cv <path.docx> --cl <path.docx> --jd <jd.txt|-> \
//                   --company "X" --role "Y" --job-id "ID" [--attempt N]
//
// At least one of --cv / --cl is required. --jd, --company, --role, --job-id
// are always required. --attempt defaults to 1.
//
// Exit code 0 = pass (overall_pct >= judge.pass_threshold_pct in
// config/guardrails.yml). Exit code 2 = fail (caller decides whether to
// retry based on judge.max_retries, also from config/guardrails.yml).
// Every attempt is appended to data/judge-history.tsv regardless of outcome.

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { extractDocxText } from "./docx-text.mjs";
import { callOpus } from "./opus-call.mjs";
import { sanitizeJd } from "./sanitize-jd.mjs";
import { versionTag } from "./prompt-version.mjs";

function arg(name, required = false) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return v;
}

const guardrails = yaml.load(fs.readFileSync("config/guardrails.yml", "utf8"));
const PASS_THRESHOLD = guardrails.judge.pass_threshold_pct;
const MAX_RETRIES = guardrails.judge.max_retries;
const HISTORY_PATH = guardrails.judge.history_log;

const cvPath = arg("cv");
const clPath = arg("cl");
const jdPath = arg("jd", true);
const company = arg("company", true);
const role = arg("role", true);
const jobId = arg("job-id", true);
const attempt = parseInt(arg("attempt") || "1", 10);

if (!cvPath && !clPath) {
  console.error("Provide at least one of --cv or --cl");
  process.exit(1);
}

// The JD is untrusted external text — neutralize any prompt-injection before it
// reaches the Opus rubric prompt (Part 7C), so a posting can't steer its own
// score. The generated CV/CL come from our own pipeline and are not sanitized.
const rawJd = jdPath === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(jdPath, "utf8");
const jdSanitized = sanitizeJd(rawJd);
if (jdSanitized.injectionSuspected) {
  console.error(`[judge] JD flagged by sanitize-jd: ${jdSanitized.flags.join("; ")}`);
}
const jd = jdSanitized.text;
const cvText = extractDocxText(cvPath);
const clText = extractDocxText(clPath);
const cvMd = fs.existsSync("cv.md") ? fs.readFileSync("cv.md", "utf8") : "";

const rubricPrompt = `You are a blind quality judge for a job application CV and cover letter. You have no knowledge of who wrote these documents or what process generated them. Score only what is in front of you, against the source CV provided as ground truth.

Score 0-100 using this weighted rubric:
- JD-keyword coverage (25%): do the documents naturally incorporate the JD's key requirements/terms, without keyword-stuffing?
- Factual grounding (25%): does every claim, skill, and metric trace to the source CV below? List any claim that does NOT trace to it.
- Tone (15%): professional, confident, free of cliches such as "passionate about", "results-oriented", "synergies", "leveraged", "spearheaded", "facilitated", "innovative", "cutting-edge".
- No em dashes / double dashes (10%): hard fail. If either document contains an em dash (the — character) or a double hyphen ("--") anywhere, set this sub-score to 0 and report exactly where.
- Structure (15%): standard ATS-parseable sections, logical flow, appropriate length.
- Formatting cleanliness (10%): judge on the apparent structural cleanliness of the extracted text (consistent paragraphing, no garbled fragments from extraction).

=== SOURCE CV (ground truth) ===
${cvMd}

=== JOB DESCRIPTION ===
${jd}

=== CANDIDATE CV TEXT (extracted from .docx) ===
${cvText || "(not provided for this attempt)"}

=== CANDIDATE COVER LETTER TEXT (extracted from .docx) ===
${clText || "(not provided for this attempt)"}

Respond with ONLY a JSON object — no prose, no markdown code fences:
{
  "cv_score": <0-100, or null if CV not provided>,
  "cl_score": <0-100, or null if CL not provided>,
  "overall_pct": <0-100, weighted average of whichever scores are present>,
  "em_dash_found": <true|false>,
  "ungrounded_claims": ["specific claim text", ...],
  "feedback": "specific, actionable revision notes for whichever document(s) scored below ${PASS_THRESHOLD}"
}`;

const call = await callOpus(rubricPrompt, "judge", { jobId });

if (!call.ok) {
  if (call.haltedByBudget) {
    console.error("HALTED: token budget ceiling reached, judge did not run.", JSON.stringify(call.status));
    process.exit(4);
  }
  console.error("Judge process failed:", call.error);
  process.exit(1);
}

let verdict;
try {
  const jsonMatch = call.text.match(/\{[\s\S]*\}/);
  verdict = JSON.parse(jsonMatch[0]);
} catch {
  console.error("Could not parse judge output as JSON:\n", call.text);
  process.exit(1);
}

const pass = verdict.overall_pct >= PASS_THRESHOLD;
const willRetry = !pass && attempt <= MAX_RETRIES;
const timestamp = new Date().toISOString();

// Stamp the judge prompt version so this score is reproducible (Part 7F).
const promptVersion = versionTag("judge") || "";
const row = [
  jobId, company, role, attempt,
  verdict.cv_score ?? "", verdict.cl_score ?? "", verdict.overall_pct,
  pass, willRetry, timestamp, promptVersion,
].join("\t");

fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
if (!fs.existsSync(HISTORY_PATH)) {
  fs.writeFileSync(
    HISTORY_PATH,
    "job_id\tcompany\trole\tattempt\tcv_score\tcl_score\toverall_pct\tpass\tsent_back\ttimestamp\tprompt_version\n"
  );
}
fs.appendFileSync(HISTORY_PATH, row + "\n");

const final = attempt > MAX_RETRIES;
console.log(JSON.stringify({ ...verdict, pass, attempt, max_retries: MAX_RETRIES, final, prompt_version: promptVersion }, null, 2));

if (!pass) {
  if (final) {
    console.error(
      `\nAttempt ${attempt} still below ${PASS_THRESHOLD}% after ${MAX_RETRIES} retries. ` +
      `Flag the user with the best attempt + this feedback. Do not retry further.`
    );
  } else {
    console.error(`\nAttempt ${attempt} below ${PASS_THRESHOLD}%. Retry (${MAX_RETRIES - attempt + 1} left) using the feedback above.`);
  }
}

process.exit(pass ? 0 : 2);
