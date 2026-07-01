#!/usr/bin/env node
// applier.mjs — fills an online application form via Playwright, then STOPS
// and posts to Slack for review. It NEVER clicks submit. That is a hard rule
// (see CLAUDE.md Ethical Use), not a placeholder — the actual submit-on-
// approval mechanism (single-use, expiring, verified-approver) is separate
// infrastructure from RE_ARCHITECTURE.md Part 7D, not yet built. Until that
// exists, a human completes the submission themselves after reviewing the
// filled form.
//
// Usage:
//   node applier.mjs --report reports/228-acme-2026-07-01.md [--headed]
//
// Preflight order (cheapest / safest checks first):
//   1. apply_enabled in config/guardrails.yml (shadow mode = refuse outright)
//   2. legitimacy + blocklist gates (re-checked; state may have changed since evaluation)
//   3. duplicate guard, scoped to "already Applied" only (re-evaluating/re-drafting
//      for an Evaluated-but-not-yet-applied job is fine; double-applying is not)
//   4. volume caps (re-checked; state may have changed since evaluation)
//   5. ATS allowlist (greenhouse/ashby/lever/workable) — anything else gets
//      draft-only answers, no programmatic fill
//   6. liveness re-check via Playwright (posting may have closed since the scan)
//   7. curated-question classifier — any essay-style question flags the whole
//      form for manual application; nothing is filled

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import yaml from "js-yaml";
import { chromium } from "playwright";
import { parseReport } from "./report-parse.mjs";
import { legitimacyGate, blocklistGate, duplicateGuard, volumeCapStatus, atsFromUrl } from "./gates.mjs";
import { matchVaultKey, getVaultEntry } from "./vault.mjs";
import { callOpus, postSpendSummary } from "./opus-call.mjs";
import { channels, postMessage } from "./slack-client.mjs";
import { newLivenessPage, checkUrlLivenessWithFallback } from "../liveness-browser.mjs";
import { isPaused, recordFailure, resetFailures } from "./kill-switch.mjs";
import { createApprovalRequest, verifyAndConsume } from "./approval.mjs";
import { sanitizeJd } from "./sanitize-jd.mjs";
import { appendAudit } from "./audit.mjs";

function arg(name, required = false) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return v;
}

let reportPath;
let headed;
// Audit context, filled in once the report is parsed so every stop() — including
// the ones before parsing (paused/shadow refusals) — records what it can.
let actorName = "applier";
let auditCtx = { jobId: "", company: "", role: "" };

async function stop(decision) {
  const result = decision.applied ? "submitted" : (decision.ok === false ? "refused" : "ok");
  appendAudit({
    actor: actorName,
    event: `apply.${decision.stage || "stop"}`,
    result,
    ...auditCtx,
    detail: decision.reason || decision.note || "",
  });
  // End-of-run spend summary for this application (skipped when the job recorded
  // no Opus calls, e.g. a shadow-mode / paused refusal that never drafted).
  if (auditCtx.jobId) {
    await postSpendSummary({
      jobId: auditCtx.jobId,
      label: `job ${auditCtx.jobId} — ${auditCtx.company || "?"} (${auditCtx.role || "?"}) · ${result}`,
    });
  }
  console.log(JSON.stringify(decision, null, 2));
  process.exit(decision.applied ? 0 : (decision.ok === false ? 1 : 0));
}

// --- Submit flow (Part 7D): runs ONLY after a verified Slack approval. Burns
// the single-use token, re-runs every pre-submit gate (state may have changed
// since the fill), re-fills the live form, and clicks submit. Refuses in shadow
// mode / while paused / for an unverified or stale approval — nothing here can
// submit without a fresh, valid, approver-bound token. ---
async function submitFlow({ token, approver }) {
  actorName = "applier-submit";
  const guardrails = yaml.load(fs.readFileSync("config/guardrails.yml", "utf8"));
  const blocklist = fs.existsSync("config/blocklist.yml")
    ? (yaml.load(fs.readFileSync("config/blocklist.yml", "utf8")) || {})
    : {};

  if (isPaused()) {
    return stop({ ok: false, stage: "submit-preflight", reason: "pipeline is paused (kill switch) — refusing to submit." });
  }
  if (!guardrails.apply_enabled) {
    return stop({ ok: false, stage: "submit-preflight", reason: "apply_enabled is false (shadow mode) — refusing to submit." });
  }

  // Authorization first: verify + burn the token. An invalid/expired/wrong-
  // approver token is an auth rejection, not an operational failure, so it does
  // NOT count toward the auto-pause failure streak.
  const verdict = verifyAndConsume({ token, approverUserId: approver });
  if (!verdict.approved) {
    return stop({ ok: false, stage: "authorization", reason: `approval rejected: ${verdict.reason}` });
  }
  const request = verdict.request;
  const url = request.url;
  const submitReportPath = request.reportPath || reportPath;
  const parsed = submitReportPath && fs.existsSync(submitReportPath) ? parseReport(submitReportPath) : {};
  const company = request.company || parsed.company || "unknown";
  const role = request.role || parsed.role || "";
  auditCtx = { jobId: request.jobId || (submitReportPath?.match(/(\d{3})-/)?.[1] ?? ""), company, role };

  // Re-run the gates the fill phase ran — state may have drifted since.
  const legit = legitimacyGate(parsed.legitimacyTier, guardrails);
  if (legit.blocked) return stop({ ok: false, stage: "submit-gate", reason: legit.reason });
  const block = blocklistGate(company, blocklist);
  if (block.blocked) return stop({ ok: false, stage: "submit-gate", reason: block.reason });
  const dup = duplicateGuard(company, role, "data/applications.md", "Applied");
  if (dup.blocked) return stop({ ok: false, stage: "submit-gate", reason: dup.reason });
  const caps = volumeCapStatus(company, guardrails);
  if (!caps.ok) return stop({ ok: false, stage: "submit-gate", reason: "Volume cap reached, deferring.", caps });
  const { allowed } = atsFromUrl(url, guardrails);
  if (!allowed) return stop({ ok: false, stage: "submit-gate", reason: "Portal not on the auto-fill allowlist — manual submission only." });

  const browser = await chromium.launch({ headless: !headed });
  try {
    const livenessPage = await newLivenessPage(browser);
    const liveness = await checkUrlLivenessWithFallback(livenessPage, url, {});
    if (liveness.result === "expired") {
      return stop({ ok: false, stage: "submit-liveness", reason: `Posting closed before submit: ${liveness.reason}` });
    }
    await livenessPage.close();

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);

    const fields = await extractFormFields(page);
    if (fields.some((f) => isCuratedQuestion(f.label))) {
      return stop({ ok: false, stage: "submit-guard", reason: "Curated question(s) present at submit time — refusing to auto-submit; complete manually." });
    }
    const draft = await draftAnswers(submitReportPath, { parsed: { ...parsed, company, role }, questions: fields });
    await fillForm(page, fields, draft);

    const submitBtn = await findSubmitButton(page);
    if (!submitBtn) {
      recordFailure(`${company}: submit button not found`);
      return stop({ ok: false, stage: "submit", reason: "Could not locate a submit button on the form." });
    }
    await submitBtn.click();
    await page.waitForTimeout(2500);
    const confirmShot = path.join("output", `submitted-${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.png`);
    fs.mkdirSync("output", { recursive: true });
    await page.screenshot({ path: confirmShot, fullPage: true });

    // Record the application in the tracker via the TSV + merge path (never edit
    // applications.md directly). Status -> Applied.
    const jobId = request.jobId || (submitReportPath?.match(/(\d{3})-/)?.[1] ?? "000");
    writeAppliedTsv({ jobId, company, role, score: parsed.score, reportPath: submitReportPath });

    resetFailures();
    await postMessage(
      channels.jobApprovals,
      `✅ *Submitted* — *${company}* — ${role}\nApproved by <@${approver}>. Confirmation screenshot: ${confirmShot}\n${url}`
    ).catch(() => {});

    return stop({ ok: true, stage: "submitted", applied: true, url, confirmShot, approvedBy: approver });
  } catch (err) {
    recordFailure(`${company}: ${err.message}`);
    await postMessage(channels.jobApprovals, `⚠️ Submit failed for *${company}* — ${role}: ${err.message}`).catch(() => {});
    return stop({ ok: false, stage: "submit", reason: err.message });
  } finally {
    await browser.close();
  }
}

async function main() {
  const guardrails = yaml.load(fs.readFileSync("config/guardrails.yml", "utf8"));
  const blocklist = fs.existsSync("config/blocklist.yml")
    ? (yaml.load(fs.readFileSync("config/blocklist.yml", "utf8")) || {})
    : {};

  if (isPaused()) {
    return stop({ ok: false, stage: "preflight", reason: "pipeline is paused (kill switch) — refusing to apply. Resume with `node pipeline/kill-switch.mjs resume`." });
  }

  if (!guardrails.apply_enabled) {
    return stop({ ok: false, stage: "preflight", reason: "apply_enabled is false in config/guardrails.yml (shadow mode) — refusing to apply." });
  }

  const parsed = parseReport(reportPath);
  if (!parsed.company || parsed.score == null) {
    return stop({ ok: false, stage: "preflight", reason: `Could not parse ${reportPath}` });
  }
  auditCtx = {
    jobId: reportPath.match(/(\d{3})-/)?.[1] || "",
    company: parsed.company,
    role: parsed.role || "",
  };
  const url = arg("url") || parsed.url;
  if (!url) {
    return stop({ ok: false, stage: "preflight", reason: "No URL provided and none found in the report (**URL:** field missing)." });
  }

  const legit = legitimacyGate(parsed.legitimacyTier, guardrails);
  if (legit.blocked) return stop({ ok: false, stage: "preflight", reason: legit.reason });

  const block = blocklistGate(parsed.company, blocklist);
  if (block.blocked) return stop({ ok: false, stage: "preflight", reason: block.reason });

  const dup = duplicateGuard(parsed.company, parsed.role, "data/applications.md", "Applied");
  if (dup.blocked) return stop({ ok: false, stage: "preflight", reason: dup.reason });

  const caps = volumeCapStatus(parsed.company, guardrails);
  if (!caps.ok) return stop({ ok: false, stage: "preflight", reason: "Volume cap reached, deferring.", caps });

  const { ats, allowed } = atsFromUrl(url, guardrails);

  if (!allowed) {
    // Draft-only: still worth generating answers for manual copy-paste, but
    // no programmatic fill and no browser automation on an unlisted host.
    const draft = await draftAnswers(reportPath, { parsed, questions: null });
    await postMessage(
      channels.jobPipeline,
      `*${parsed.company}* — ${parsed.role}: portal (${ats || new URL(url).hostname}) is not on the auto-fill allowlist (greenhouse/ashby/lever/workable). Draft-only, needs manual application.\n${url}`
    ).catch(() => {});
    return stop({ ok: true, stage: "draft-only", ats, url, draft });
  }

  const browser = await chromium.launch({ headless: !headed });
  try {
    const livenessPage = await newLivenessPage(browser);
    const liveness = await checkUrlLivenessWithFallback(livenessPage, url, {});
    if (liveness.result === "expired") {
      return stop({ ok: false, stage: "liveness-recheck", reason: `Posting appears closed at apply time: ${liveness.reason}` });
    }
    await livenessPage.close();

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);

    const fields = await extractFormFields(page);
    if (!fields.length) {
      return stop({ ok: false, stage: "extract", reason: "No form fields detected — page may require manual navigation to the application form." });
    }

    const curated = fields.filter((f) => isCuratedQuestion(f.label));
    if (curated.length) {
      await postMessage(
        channels.jobPipeline,
        `*${parsed.company}* — ${parsed.role}: form has ${curated.length} curated question(s) (e.g. "${curated[0].label}") — flagged for manual application, nothing filled.\n${url}`
      ).catch(() => {});
      return stop({ ok: true, stage: "curated-flag", curatedQuestions: curated.map((f) => f.label), url });
    }

    const draft = await draftAnswers(reportPath, { parsed, questions: fields });
    const fillResult = await fillForm(page, fields, draft);

    const screenshotPath = path.join("output", `applier-${parsed.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.png`);
    fs.mkdirSync("output", { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Part 7D approval gate: issue a single-use, 12h-expiry, approver-bound
    // token. Nothing is submitted here — submission happens only when a verified
    // approver replies `approve <token>` and the consumer drives `--submit`.
    const request = createApprovalRequest({
      jobId: parsed.jobId || (reportPath.match(/(\d{3})-/)?.[1] ?? null),
      company: parsed.company,
      role: parsed.role,
      url,
      reportPath,
      screenshotPath,
    });

    await postMessage(
      channels.jobApprovals,
      `*${parsed.company}* — ${parsed.role}\nForm filled and ready for review. This does NOT submit automatically.\n` +
      `Filled: ${fillResult.filled.length} field(s). Flagged for manual entry: ${fillResult.manual.length} field(s)${fillResult.manual.length ? ` (${fillResult.manual.map((m) => m.label).join(", ")})` : ""}.\n` +
      `Screenshot: ${screenshotPath}\n${url}\n` +
      `\nTo authorize submission, reply in this channel:  \`approve ${request.token}\`\n` +
      `Single-use · expires in 12h · only a verified approver can action it.`
    ).catch(() => {});

    return stop({
      ok: true,
      stage: "filled-awaiting-approval",
      applied: false,
      url,
      screenshotPath,
      approvalToken: request.token,
      filled: fillResult.filled,
      flaggedManual: fillResult.manual,
      note: "Awaiting Slack approval. A verified approver replies `approve <token>` to authorize submission via `applier.mjs --submit`.",
    });
  } finally {
    await browser.close();
  }
}

// --- Curated-question classifier: essay-style questions that need a genuine,
// specific human answer rather than a templated one. ---
const CURATED_PATTERNS = [
  /why (do you want to work|are you interested|this role|this company)/i,
  /tell us about yourself/i,
  /describe a (time|situation|challenge|project)/i,
  /walk us through/i,
  /what (interests|excites|motivates) you/i,
  /what makes you (a good fit|unique|the right)/i,
  /how would you approach/i,
];

export function isCuratedQuestion(label) {
  return CURATED_PATTERNS.some((p) => p.test(label || ""));
}

// --- Form field extraction: best-effort generic scan. Per-ATS selector
// tuning (Greenhouse/Ashby/Lever/Workable each render differently) is future
// work — this covers the common case of labeled inputs/textareas/selects. ---
async function extractFormFields(page) {
  return page.evaluate(() => {
    function labelFor(el) {
      if (el.id) {
        const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (byFor?.textContent?.trim()) return byFor.textContent.trim();
      }
      const aria = el.getAttribute("aria-label");
      if (aria?.trim()) return aria.trim();
      const wrappingLabel = el.closest("label");
      if (wrappingLabel?.textContent?.trim()) return wrappingLabel.textContent.trim();
      const prev = el.previousElementSibling;
      if (prev && /label|span|div|p/i.test(prev.tagName) && prev.textContent?.trim().length < 200) {
        return prev.textContent.trim();
      }
      return el.getAttribute("placeholder") || el.name || "";
    }

    const els = Array.from(document.querySelectorAll("input, textarea, select")).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && el.type !== "hidden";
    });

    return els.map((el, i) => ({
      index: i,
      tag: el.tagName.toLowerCase(),
      type: el.type || el.tagName.toLowerCase(),
      name: el.name || "",
      id: el.id || "",
      label: labelFor(el),
      required: el.required || el.getAttribute("aria-required") === "true",
      options: el.tagName === "SELECT" ? Array.from(el.options).map((o) => o.textContent.trim()) : undefined,
    }));
  });
}

// --- Draft free-text answers via a separate Opus call (never invents
// sensitive-field content — those are vault-only, handled in fillForm). ---
async function draftAnswers(reportPathArg, { parsed, questions }) {
  const cvMd = fs.existsSync("cv.md") ? fs.readFileSync("cv.md", "utf8") : "";
  // The report is derived from untrusted posting text — neutralize any
  // prompt-injection before it reaches the Opus draft call (Part 7C).
  const reportBody = reportPathArg && fs.existsSync(reportPathArg)
    ? sanitizeJd(fs.readFileSync(reportPathArg, "utf8")).text
    : "";
  const questionList = (questions || [])
    .filter((f) => !matchVaultKey(f.label))
    .map((f) => `- [${f.type}] ${f.label}`)
    .join("\n") || "(draft-only mode: no live form, generate general application talking points)";

  const prompt = `Draft short, specific application form answers for this candidate applying to ${parsed.company} — ${parsed.role}.

Rules: never invent skills or metrics not present in the source CV. No em dashes or double dashes. No cliches ("passionate about", "results-oriented", etc). Match the tone in modes/_shared.md's Professional Writing rules: concrete, specific, varied sentence structure.

=== SOURCE CV ===
${cvMd}

=== EVALUATION REPORT (context on fit, archetype, proof points) ===
${reportBody}

=== FORM QUESTIONS ===
${questionList}

Respond with ONLY a JSON object mapping each question's exact label text to a drafted answer string:
{ "question label": "answer", ... }`;

  const call = await callOpus(prompt, "applier-draft", { jobId: auditCtx.jobId });
  if (!call.ok) return { error: call.haltedByBudget ? "token budget halted" : call.error };
  try {
    const jsonMatch = call.text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { error: "Could not parse drafted answers as JSON" };
  }
}

// --- Fill the form: sensitive fields from the vault only, everything else
// from the drafted answers. Never invents a sensitive-field value. ---
async function fillForm(page, fields, draft) {
  const filled = [];
  const manual = [];

  for (const field of fields) {
    const vaultKey = matchVaultKey(field.label);
    let value = null;

    if (vaultKey) {
      value = getVaultEntry(vaultKey);
      if (value == null) {
        manual.push({ label: field.label, reason: `sensitive field, no vault entry for "${vaultKey}"` });
        continue;
      }
    } else if (draft && typeof draft === "object" && !draft.error) {
      value = draft[field.label];
    }

    if (value == null) {
      manual.push({ label: field.label, reason: "no drafted answer available" });
      continue;
    }

    try {
      const locator = field.id ? page.locator(`#${field.id.replace(/([:.[\],])/g, "\\$1")}`) : page.locator(`[name="${field.name}"]`).first();
      if (field.tag === "select") {
        await locator.selectOption({ label: value }).catch(() => locator.selectOption(value));
      } else {
        await locator.fill(String(value));
      }
      filled.push({ label: field.label, value });
    } catch (err) {
      manual.push({ label: field.label, reason: `fill failed: ${err.message}` });
    }
  }

  return { filled, manual };
}

// --- Locate the form's submit control. Tries the semantic types first, then
// falls back to buttons whose text reads like a submit action. Returns a
// Playwright locator handle or null. ---
async function findSubmitButton(page) {
  const candidates = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Submit application")',
    'button:has-text("Submit Application")',
    'button:has-text("Submit")',
    'button:has-text("Apply")',
  ];
  for (const sel of candidates) {
    const loc = page.locator(sel).first();
    if (await loc.count().catch(() => 0)) {
      if (await loc.isVisible().catch(() => false)) return loc;
    }
  }
  return null;
}

// --- Record a submitted application to the tracker via the TSV + merge path
// (never edits applications.md directly). Status -> Applied. ---
function writeAppliedTsv({ jobId, company, role, score, reportPath: rp }) {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const date = new Date().toISOString().slice(0, 10);
  const reportLink = rp ? `[${jobId}](reports/${rp.split("/").pop()})` : "";
  const row = [
    jobId, date, company, role || "", "Applied",
    score != null ? `${Number(score).toFixed(1)}/5` : "", "❌", reportLink,
    "Submitted via applier.mjs after Slack approval",
  ].join("\t");
  fs.mkdirSync("batch/tracker-additions", { recursive: true });
  fs.writeFileSync(`batch/tracker-additions/${jobId}-${slug}-applied.tsv`, row + "\n");
  spawnSync("node", ["merge-tracker.mjs"], { encoding: "utf8" });
}

// --- CLI entry point (only runs when this file is executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  headed = process.argv.includes("--headed");
  if (process.argv.includes("--submit")) {
    // Post-approval submission path: driven by the approval consumer.
    const token = arg("token", true);
    const approver = arg("approver", true);
    reportPath = arg("report"); // optional; the approval request carries its own reportPath
    submitFlow({ token, approver }).catch((err) => {
      console.error("applier.mjs --submit fatal error:", err);
      process.exit(1);
    });
  } else {
    reportPath = arg("report", true);
    main().catch((err) => {
      console.error("applier.mjs fatal error:", err);
      process.exit(1);
    });
  }
}
