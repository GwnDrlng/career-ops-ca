#!/usr/bin/env node
// curate-docs.mjs — generates a tailored CV + cover letter for a curated-docgen
// lane report. This is the doc-generation step the `curated-docgen` tier
// promises (config/guardrails.yml: "curated CV+CL … lane starts here"): it was
// never wired up, so high-scoring reports fell straight through to applier.mjs
// (inline form answers only) and no candidate-facing documents were produced.
//
// Flow:
//   1. Parse the report (score/company/role) + read cv.md + config/profile.yml.
//   2. One Opus call (lane: curated-docgen, token-gated like every other LLM
//      call) returns a JSON with a `resume` object (generate-docx.mjs schema)
//      and a `cover_letter` object (generate-cover-letter.mjs schema), grounded
//      strictly in cv.md — no invented skills, metrics, or employers.
//   3. Render both via the existing general-purpose docx generators.
//
// The report body is untrusted posting-derived text, so it is run through
// sanitizeJd() before it reaches the prompt (Part 7C), same as applier.mjs.
//
// Usage:
//   node pipeline/curate-docs.mjs --report reports/230-jobber-2026-07-02.md
//
// Prints a JSON decision to stdout. Exit code is 0 on success, 1 only if the
// report can't be parsed at all (a budget halt or LLM failure is a clean
// { ok: false } refusal, not a crash — the watcher still hands off to applier).

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { parseReport } from "./report-parse.mjs";
import { callOpus } from "./opus-call.mjs";
import { sanitizeJd } from "./sanitize-jd.mjs";
import { appendAudit } from "./audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

function arg(name, required = false) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return v;
}

function slugify(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const reportPath = arg("report", true);
const abs = path.isAbsolute(reportPath) ? reportPath : path.join(PROJECT_ROOT, reportPath);
if (!fs.existsSync(abs)) {
  console.error(`Report not found: ${reportPath}`);
  process.exit(1);
}

const parsed = parseReport(abs);
if (!parsed.company || parsed.score == null) {
  console.error(`Could not parse company/score from ${reportPath}. Machine Summary or header fields missing/malformed.`);
  process.exit(1);
}

const jobId = reportPath.match(/(\d{3})-/)?.[1] || "";
const auditCtx = { jobId, company: parsed.company, role: parsed.role || "" };

function stop(decision) {
  appendAudit({
    actor: "curate-docs",
    event: "curate.docgen",
    result: decision.ok === false ? "refused" : "ok",
    ...auditCtx,
    detail: decision.reason || (decision.resumePath ? `${decision.resumePath}, ${decision.coverLetterPath}` : ""),
  });
  console.log(JSON.stringify({ jobId, company: parsed.company, role: parsed.role, ...decision }, null, 2));
  process.exit(0);
}

// --- Identity block from the user's profile (never invented by the model) ---
const profile = fs.existsSync(path.join(PROJECT_ROOT, "config/profile.yml"))
  ? (yaml.load(fs.readFileSync(path.join(PROJECT_ROOT, "config/profile.yml"), "utf8")) || {})
  : {};
const candidate = profile.candidate || {};
const identity = {
  name: candidate.full_name || "",
  email: candidate.email || "",
  linkedin: candidate.linkedin || "",
  location: candidate.location || "",
  headline: profile.narrative?.headline || "",
};

const cvMd = fs.existsSync(path.join(PROJECT_ROOT, "cv.md"))
  ? fs.readFileSync(path.join(PROJECT_ROOT, "cv.md"), "utf8")
  : "";
if (!cvMd.trim()) {
  stop({ ok: false, reason: "cv.md is missing or empty — cannot generate curated documents." });
}
const reportBody = sanitizeJd(parsed.body).text;

const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const prompt = `You are tailoring a candidate's CV and cover letter for one specific role. Produce a single JSON object with two keys: "resume" and "cover_letter".

Hard rules:
- Ground everything in the SOURCE CV. NEVER invent skills, metrics, employers, dates, or titles not present there.
- No em dashes or double dashes anywhere. Use commas, semicolons, colons, or parentheses.
- No cliches ("passionate about", "results-oriented", "proven track record"). Concrete, specific, varied sentences (see modes/_shared.md Professional Writing rules).
- Reorder and re-emphasize existing CV material to match this role; do not fabricate to fill gaps.

Applying to: ${parsed.company} — ${parsed.role || "role"}.

Use these EXACT identity values (do not alter them):
- name: ${identity.name}
- email: ${identity.email}
- linkedin: ${identity.linkedin}
- location: ${identity.location}
- headline/tagline base: ${identity.headline}

"resume" must match this schema (omit a key only if the CV has no such content):
{
  "name": string,
  "headline": string,                          // one line, tailored to this role
  "contact": "location | email | linkedin",
  "summary": [string, ...],                    // 1-2 Professional Summary paragraphs
  "competencies": [ { "label": string, "items": "A | B | C" }, ... ],
  "experience": [ { "role": string, "company": string, "dates": string, "intro"?: string, "groups": [ { "label"?: string, "bullets": [string, ...] } ] } ],
  "education": [string, ...],
  "certifications": [string, ...],
  "recognition"?: [ { "label": string, "text": string } ]
}

"cover_letter" must match this schema:
{
  "name": "${identity.name}",
  "tagline": string,                           // short, tailored to this role
  "email": "${identity.email}",
  "linkedin": "${identity.linkedin}",
  "location": "${identity.location}",
  "date": "${today}",
  "salutation": "${parsed.company} Hiring Team,",
  "paragraphs": [string, string, string],      // 3-4 tight paragraphs: why this role/company, the problems you'd own, concrete proof from the CV
  "close": string
}

=== SOURCE CV ===
${cvMd}

=== EVALUATION REPORT (context on fit, archetype, proof points) ===
${reportBody}

Respond with ONLY the JSON object, no prose before or after.`;

const call = await callOpus(prompt, "curated-docgen", { jobId });
if (!call.ok) {
  stop({
    ok: false,
    reason: call.haltedByBudget ? "token budget halted before curated docgen" : (call.error || "Opus call failed"),
    haltedByBudget: !!call.haltedByBudget,
  });
}

let content;
try {
  const jsonMatch = call.text.match(/\{[\s\S]*\}/);
  content = JSON.parse(jsonMatch[0]);
} catch {
  stop({ ok: false, reason: "Could not parse curated document content as JSON from the Opus response." });
}
if (!content.resume || !content.cover_letter) {
  stop({ ok: false, reason: "Opus response missing resume and/or cover_letter object." });
}

// --- Render both via the existing general-purpose docx generators ---
const slug = slugify(parsed.company);
const base = jobId ? `${jobId}-${slug}` : slug;
const outDir = path.join(PROJECT_ROOT, "output");
fs.mkdirSync(outDir, { recursive: true });

const resumeJson = path.join(outDir, `${base}-resume.json`);
const coverJson = path.join(outDir, `${base}-cover-letter.json`);
const resumeDocx = path.join(outDir, `${base}-resume.docx`);
const coverDocx = path.join(outDir, `${base}-cover-letter.docx`);
fs.writeFileSync(resumeJson, JSON.stringify(content.resume, null, 2));
fs.writeFileSync(coverJson, JSON.stringify(content.cover_letter, null, 2));

function render(script, contentPath, outPath) {
  const r = spawnSync("node", [script, contentPath, outPath], { cwd: PROJECT_ROOT, encoding: "utf8" });
  return { ok: r.status === 0, output: (r.stdout || "") + (r.stderr || "") };
}

const resumeRender = render("generate-docx.mjs", resumeJson, resumeDocx);
const coverRender = render("generate-cover-letter.mjs", coverJson, coverDocx);

if (!resumeRender.ok || !coverRender.ok) {
  stop({
    ok: false,
    reason: `docx render failed — resume: ${resumeRender.ok ? "ok" : resumeRender.output.trim()}; cover letter: ${coverRender.ok ? "ok" : coverRender.output.trim()}`,
  });
}

stop({
  ok: true,
  resumePath: path.relative(PROJECT_ROOT, resumeDocx),
  coverLetterPath: path.relative(PROJECT_ROOT, coverDocx),
});
