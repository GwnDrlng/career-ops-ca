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
import { matchIdentityField, getIdentityValue } from "./identity.mjs";
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

    let fields = await extractFormFields(page);
    if (!fields.length) {
      // Same JD-page-vs-form gap as the fill phase (Ashby et al.): reach the
      // real form before extracting, or submit would find nothing to fill.
      const reached = await reachApplicationForm(page, url);
      if (reached) {
        await page.waitForTimeout(1000);
        fields = await extractFormFields(page);
      }
    }
    if (fields.some((f) => isCuratedQuestion(f.label))) {
      return stop({ ok: false, stage: "submit-guard", reason: "Curated question(s) present at submit time — refusing to auto-submit; complete manually." });
    }
    const draft = await draftAnswers(submitReportPath, { parsed: { ...parsed, company, role }, questions: fields });
    const submitFillOpts = { salaryExpectation: resolveSalaryExpectation(parsed.body), resumePath: resolveGenericCvPath() };
    await fillForm(page, fields, draft, submitFillOpts);
    await fillCustomWidgets(page, draft, { ...submitFillOpts, company });

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

    let fields = await extractFormFields(page);
    if (!fields.length) {
      // Several ATSes (notably Ashby) land you on the job-description page; the
      // form is behind an "Apply" button or at a `/application` sub-path. Try to
      // reach it, then re-extract once, before giving up.
      const reached = await reachApplicationForm(page, url);
      if (reached) {
        await page.waitForTimeout(1000);
        fields = await extractFormFields(page);
      }
    }
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
    const fillOpts = { salaryExpectation: resolveSalaryExpectation(parsed.body), resumePath: resolveGenericCvPath() };
    const fillResult = await fillForm(page, fields, draft, fillOpts);
    // Native inputs are done; now the ATS custom widgets (yes/no button groups,
    // combobox typeaheads) that the DOM scan can't fill.
    const widgetResult = await fillCustomWidgets(page, draft, { ...fillOpts, company: parsed.company });
    fillResult.filled.push(...widgetResult.filled);
    fillResult.manual.push(...widgetResult.manual);

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
// When the landing URL is a job-description page rather than the form itself,
// try to reach the actual application form: first click an in-page "Apply"
// control, then (for Ashby, whose form lives at `{jobUrl}/application`) fall
// back to navigating to that sub-path directly. Returns true if a navigation or
// click was performed (caller re-extracts to confirm a form is now present).
async function reachApplicationForm(page, url) {
  const applyButton = page
    .locator(
      'a:has-text("Apply for this Job"), a:has-text("Apply for this job"), ' +
      'button:has-text("Apply for this Job"), button:has-text("Apply for this job"), ' +
      'a:has-text("Apply Now"), button:has-text("Apply Now"), ' +
      'a[href*="/application"], button:has-text("Apply")'
    )
    .first();
  try {
    if (await applyButton.count()) {
      await applyButton.click({ timeout: 5000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
      return true;
    }
  } catch {
    // fall through to the sub-path fallback
  }

  // Ashby fallback: the application form is a `/application` sub-path of the job.
  if (/ashbyhq\.com/i.test(url)) {
    const appUrl = url.replace(/\/+$/, "") + "/application";
    if (appUrl !== url) {
      await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      return true;
    }
  }
  return false;
}

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

    // Group question text for radio/checkbox options, whose own label is just
    // "Yes"/"No". Prefer the enclosing fieldset's <legend>, then a labelled
    // group container (role=group/radiogroup with aria-label/labelledby), then
    // the nearest preceding heading. Lets a yes/no question resolve by its
    // question text rather than the option word.
    function groupLabelFor(el) {
      const fs = el.closest("fieldset");
      const legend = fs?.querySelector("legend");
      if (legend?.textContent?.trim()) return legend.textContent.trim();
      const grp = el.closest('[role="group"], [role="radiogroup"]');
      if (grp) {
        const aria = grp.getAttribute("aria-label");
        if (aria?.trim()) return aria.trim();
        const lb = grp.getAttribute("aria-labelledby");
        if (lb) {
          const node = document.getElementById(lb);
          if (node?.textContent?.trim()) return node.textContent.trim();
        }
      }
      let node = el;
      for (let hops = 0; node && hops < 6; hops++) {
        let sib = node.previousElementSibling;
        while (sib) {
          if (/^(h[1-6]|legend|label|p|div|span)$/i.test(sib.tagName)) {
            const t = sib.textContent?.trim();
            if (t && t.length < 200 && /\?|:$|select|choose|are you|do you|can you|willing|able/i.test(t)) return t;
          }
          sib = sib.previousElementSibling;
        }
        node = node.parentElement;
      }
      return "";
    }

    // Include file inputs even when visually hidden (styled dropzones, e.g.
    // Ashby, hide the real <input type=file> behind CSS) — Playwright can still
    // set files on a hidden input, and we need those for resume upload.
    const els = Array.from(document.querySelectorAll("input, textarea, select")).filter((el) => {
      if (el.type === "hidden") return false;
      // Custom combobox typeaheads (role=combobox) are handled by the live
      // fillCustomWidgets pass, not by native fill — skip them here so they
      // aren't double-reported as unfillable "Start typing..." fields.
      if (el.getAttribute("role") === "combobox") return false;
      if (el.type === "file") return true;
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });

    return els.map((el, i) => ({
      index: i,
      tag: el.tagName.toLowerCase(),
      type: el.type || el.tagName.toLowerCase(),
      name: el.name || "",
      id: el.id || "",
      label: labelFor(el),
      groupLabel: groupLabelFor(el),
      accept: el.getAttribute("accept") || "",
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
  // Exclude sensitive (vault) AND identity (name/phone/location) fields from the
  // Opus prompt: those are filled deterministically from the vault / profile, so
  // no PII ever reaches an LLM and no identity value can be hallucinated.
  const questionList = (questions || [])
    .filter((f) => !matchVaultKey(f.label) && !matchIdentityField(f.label, f.groupLabel))
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

// --- Salary expectation: the midpoint of the comp band the posting discloses.
// Reads the report's Comp section first (the disclosed band lives there) and
// falls back to the whole body; considers only figures in a plausible salary
// window so proof-point numbers (ARR, growth %) don't leak in. Returns null when
// the posting shows no usable band — the caller then falls back to the personal
// default held in the local Keychain vault (never a number baked into this
// committed file). ---
export function resolveSalaryExpectation(body) {
  if (!body) return null;
  const compSection = body.match(/##\s*[^\n]*\bComp\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i)?.[1] || "";
  const moneyRe = /\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*([KkMm])?/g;
  const figuresIn = (src) => {
    const out = [];
    let m;
    while ((m = moneyRe.exec(src)) !== null) {
      let n = parseFloat(m[1].replace(/,/g, ""));
      const suf = m[2]?.toLowerCase();
      if (suf === "k") n *= 1000;
      else if (suf === "m") n *= 1_000_000;
      if (n >= 40000 && n <= 2_000_000) out.push(n);
    }
    moneyRe.lastIndex = 0;
    return out;
  };
  // Prefer the Comp section; if it yields no usable band, scan the whole body.
  let figures = figuresIn(compSection);
  if (figures.length < 2) figures = figuresIn(body);
  if (figures.length >= 2) {
    return Math.round((Math.min(...figures) + Math.max(...figures)) / 2);
  }
  if (figures.length === 1) return figures[0]; // a single disclosed number
  return null; // no band disclosed — caller uses the local vault default
}

// --- Fill the form: sensitive fields from the vault only, everything else
// from the drafted answers. Never invents a sensitive-field value. The salary
// expectation is the one sensitive field the caller may supply a computed
// fallback for (opts.salaryExpectation), since it's derived from the posting's
// own disclosed band rather than invented. ---
// --- Generic CV to attach on resume/CV file-upload fields (the sub-3.7
// generic-apply lane). The path comes from config/profile.yml's `cv.generic_pdf`
// (user layer, gitignored) so no personal filename is baked into the repo.
// Returns the path only when it's configured AND the file exists; otherwise null,
// and the caller flags the upload field for manual handling. ---
function resolveGenericCvPath() {
  try {
    const profile = fs.existsSync("config/profile.yml")
      ? (yaml.load(fs.readFileSync("config/profile.yml", "utf8")) || {})
      : {};
    const p = profile?.cv?.generic_pdf;
    if (p && fs.existsSync(p)) return p;
  } catch { /* fall through to null */ }
  return null;
}

// --- Value resolution precedence for a single form field: Keychain vault
// (sensitive answers) -> identity (config/profile.yml form_autofill) -> Opus
// draft. A field's question text can live either on the field itself or on its
// group legend (radio/select yes-no), so both are checked. Returns a
// { value, source, key } descriptor, or null when nothing resolves (the caller
// then flags the field for manual entry). Never invents a value. ---
function resolveFieldValue(field, draft, opts) {
  // matchVaultKey/matchIdentityField test each candidate label independently so
  // anchored patterns (e.g. /^gender$/i, /^name$/i) aren't broken by joining.
  const labels = [field.label, field.groupLabel].filter(Boolean);
  const vaultKey = labels.map((l) => matchVaultKey(l)).find(Boolean) || null;
  if (vaultKey) {
    // Salary expectation: posting-derived midpoint wins when disclosed, else the
    // personal default in the local Keychain vault. No comp number is committed.
    const value = (vaultKey === "salary_expectation" && opts.salaryExpectation != null)
      ? String(opts.salaryExpectation)
      : getVaultEntry(vaultKey);
    return { value, source: "vault", key: vaultKey };
  }
  const idKey = matchIdentityField(...labels);
  if (idKey) {
    return { value: getIdentityValue(idKey), source: "identity", key: idKey };
  }
  if (draft && typeof draft === "object" && !draft.error) {
    return { value: draft[field.label] ?? null, source: "draft", key: field.label };
  }
  return { value: null, source: "none", key: field.label };
}

const truthyYes = (v) => /^\s*(yes|y|true|1)\s*$/i.test(String(v ?? ""));

// Closest visible <option>/radio label for a desired value. Exact
// (case-insensitive) first, then substring either direction, then best token
// overlap. Lets "Company website" land on "Company Website / Careers Page" and
// "Yes" land on "Yes, I can". Returns null if nothing plausibly matches. ---
export function closestOption(options, value) {
  if (!Array.isArray(options) || !options.length || value == null) return null;
  const want = String(value).trim().toLowerCase();
  if (!want) return null;
  const norm = (s) => String(s).trim().toLowerCase();
  let exact = options.find((o) => norm(o) === want);
  if (exact) return exact;
  let sub = options.find((o) => norm(o).includes(want) || want.includes(norm(o)));
  if (sub) return sub;
  const wantToks = new Set(want.split(/\W+/).filter(Boolean));
  let best = null, bestScore = 0;
  for (const o of options) {
    const toks = norm(o).split(/\W+/).filter(Boolean);
    const score = toks.filter((t) => wantToks.has(t)).length;
    if (score > bestScore) { bestScore = score; best = o; }
  }
  return bestScore > 0 ? best : null;
}

// "How did you hear about this job?" option picker. ATS referral dropdowns
// phrase "the company's own site" many ways ("Company Website", "Careers Page",
// "{Company} Careers Site"), so a literal "Company website" answer rarely
// string-matches. When the answer names the company's site, prefer an option
// that (a) contains the company name and a site word, else (b) any careers/
// website option, else (c) an option containing "company". Falls back to the
// generic closest-option match otherwise. ---
export function pickReferralOption(options, desired, company) {
  if (!Array.isArray(options) || !options.length) return null;
  const norm = (s) => String(s).toLowerCase();
  const want = norm(desired);
  const wantsSite = /(company|career|careers|website|web site|\bsite\b|our site)/.test(want);
  if (wantsSite) {
    const compTok = company ? norm(company).split(/\W+/).filter((t) => t.length > 2) : [];
    const siteWord = /(career|careers|website|web ?site|\bsite\b)/;
    let best = options.find((o) => compTok.some((t) => norm(o).includes(t)) && siteWord.test(norm(o)));
    if (best) return best;
    best = options.find((o) => siteWord.test(norm(o)));
    if (best) return best;
    best = options.find((o) => norm(o).includes("company"));
    if (best) return best;
  }
  return closestOption(options, desired);
}

async function fillForm(page, fields, draft, opts = {}) {
  const filled = [];
  const manual = [];

  // Attribute-safe selector (`[id="…"]` / `[name="…"]`) — the `#id` shorthand is
  // invalid CSS when the id starts with a digit or is a UUID (common on Ashby)
  // and throws SyntaxError. Hoisted so every branch shares one definition.
  const attrSel = (attr, v) => `[${attr}="${String(v).replace(/(["\\])/g, "\\$1")}"]`;
  const selectorFor = (f) => f.id ? attrSel("id", f.id) : (f.name ? attrSel("name", f.name) : null);
  const fileFieldCount = fields.filter((f) => f.type === "file").length;

  // Radio options render as one field per option; group them so a yes-no
  // question resolves once (by its legend) and we click the matching option.
  // Group by shared `name`, falling back to the group legend when radios carry
  // no name (common on custom Ashby widgets).
  const radios = fields.filter((f) => f.type === "radio");
  const radioGroups = new Map();
  for (const r of radios) {
    const gk = r.name || `legend:${r.groupLabel}`;
    if (!radioGroups.has(gk)) radioGroups.set(gk, []);
    radioGroups.get(gk).push(r);
  }

  for (const field of fields) {
    if (field.type === "radio") continue; // handled as groups below

    // File-upload fields (resume/CV): the generic-apply lane attaches the
    // pre-generated generic CV PDF (path from config, never a repo-baked name).
    // Cover-letter/portfolio and other file inputs are left for manual handling;
    // a file is never invented.
    if (field.type === "file") {
      const looksResume = /resum|résum|\bcv\b|curriculum/i.test(`${field.label} ${field.name} ${field.id}`);
      if (!(looksResume || fileFieldCount === 1)) {
        manual.push({ label: field.label || "(file upload)", reason: "non-resume file field — attach manually" });
        continue;
      }
      if (!opts.resumePath) {
        manual.push({ label: field.label || "(resume upload)", reason: "no generic CV configured — set cv.generic_pdf in config/profile.yml" });
        continue;
      }
      const fileSel = selectorFor(field);
      if (!fileSel) {
        manual.push({ label: field.label || "(resume upload)", reason: "no id/name attribute to target upload field" });
        continue;
      }
      try {
        await page.locator(fileSel).first().setInputFiles(opts.resumePath);
        filled.push({ label: field.label || "(resume upload)", value: path.basename(opts.resumePath) });
      } catch (err) {
        manual.push({ label: field.label || "(resume upload)", reason: `resume upload failed: ${err.message}` });
      }
      continue;
    }

    const resolved = resolveFieldValue(field, draft, opts);
    const value = resolved.value;
    if (value == null) {
      const reason = resolved.source === "vault"
        ? `sensitive field, no vault entry for "${resolved.key}"`
        : (resolved.source === "identity" ? `no identity value configured for "${resolved.key}"` : "no drafted answer available");
      manual.push({ label: field.label, reason });
      continue;
    }

    // Single yes/no consent checkbox (e.g. background-check consent): check it
    // only when the resolved answer is affirmative; never auto-check otherwise.
    if (field.type === "checkbox") {
      const sel = selectorFor(field);
      if (!sel) { manual.push({ label: field.label, reason: "no id/name attribute to target field" }); continue; }
      try {
        if (truthyYes(value)) { await page.locator(sel).first().check(); filled.push({ label: field.label, value: "checked" }); }
        else { manual.push({ label: field.label, reason: `resolved answer "${value}" is not affirmative — left unchecked for review` }); }
      } catch (err) {
        manual.push({ label: field.label, reason: `checkbox failed: ${err.message}` });
      }
      continue;
    }

    // Fields with neither a usable id nor name can't be targeted — flag them for
    // manual entry instead of falling back to `[name=""]`, which matches nothing
    // and hangs until the fill timeout.
    const selector = selectorFor(field);
    if (!selector) {
      manual.push({ label: field.label, reason: "no id/name attribute to target field" });
      continue;
    }

    try {
      const locator = page.locator(selector).first();
      if (field.tag === "select") {
        // Try exact label/value, then fall back to the closest visible option so
        // "Company website" resolves to whatever the dropdown actually offers.
        const ok = await locator.selectOption({ label: value })
          .then(() => true)
          .catch(() => locator.selectOption(value).then(() => true).catch(() => false));
        if (!ok) {
          const opt = closestOption(field.options, value);
          if (opt) { await locator.selectOption({ label: opt }); filled.push({ label: field.label, value: opt }); continue; }
          manual.push({ label: field.label, reason: `no option matched "${value}" (options: ${(field.options || []).join(", ")})` });
          continue;
        }
      } else {
        await locator.fill(String(value));
      }
      filled.push({ label: field.label, value });
    } catch (err) {
      manual.push({ label: field.label, reason: `fill failed: ${err.message}` });
    }
  }

  // Radio groups: resolve the desired answer once from the legend, then click
  // the option whose label matches (e.g. legend "Are you able to be in-office a
  // few days a week?" -> vault onsite_commitment "Yes" -> click the "Yes" radio).
  for (const [, group] of radioGroups) {
    const legend = group.find((r) => r.groupLabel)?.groupLabel || group[0].label;
    const probe = { label: legend, groupLabel: legend, type: "radio", options: group.map((r) => r.label) };
    const resolved = resolveFieldValue(probe, draft, opts);
    if (resolved.value == null) {
      manual.push({ label: legend, reason: resolved.source === "vault" ? `sensitive radio, no vault entry for "${resolved.key}"` : "no answer available for radio group" });
      continue;
    }
    const wantLabel = closestOption(group.map((r) => r.label), resolved.value);
    const target = group.find((r) => r.label === wantLabel);
    const sel = target ? selectorFor(target) : null;
    if (!sel) {
      manual.push({ label: legend, reason: `no radio option matched "${resolved.value}" (options: ${group.map((r) => r.label).join(", ")})` });
      continue;
    }
    try {
      await page.locator(sel).first().check();
      filled.push({ label: legend, value: target.label });
    } catch (err) {
      manual.push({ label: legend, reason: `radio select failed: ${err.message}` });
    }
  }

  return { filled, manual };
}

// --- Custom (non-native) ATS widgets that extractFormFields can't see or fill:
// Ashby renders yes/no questions as bare <button>Yes</button>/<button>No</button>
// groups (backed by a hidden checkbox) and renders location / "how did you hear"
// as role=combobox typeaheads. This pass walks each field-entry live, resolves
// the answer through the SAME precedence as fillForm (vault -> identity ->
// draft), and clicks the matching control. Sensitive answers still come ONLY
// from the vault; nothing is invented. ---
async function fillCustomWidgets(page, draft, opts = {}) {
  const filled = [];
  const manual = [];

  // Both button-group and combobox entries carry an Ashby field-entry class.
  const entries = page.locator("[class*='fieldEntry'], .ashby-application-form-field-entry");
  const count = await entries.count().catch(() => 0);
  const seen = new Set();

  for (let i = 0; i < count; i++) {
    const entry = entries.nth(i);
    const label = ((await entry.locator("label, legend").first().textContent().catch(() => "")) || "")
      .replace(/\s+/g, " ").replace(/\*+$/, "").trim();
    if (!label || seen.has(label)) continue;

    const comboCount = await entry.locator("[role='combobox']").count().catch(() => 0);
    const yesNo = entry.locator("button", { hasText: /^\s*(Yes|No)\s*$/ });
    const btnCount = await yesNo.count().catch(() => 0);

    // --- Yes/No button group ---
    if (comboCount === 0 && btnCount >= 1) {
      seen.add(label);
      const resolved = resolveFieldValue({ label, groupLabel: label, type: "buttongroup", options: ["Yes", "No"] }, draft, opts);
      if (resolved.value == null) {
        manual.push({ label, reason: resolved.source === "vault" ? `sensitive yes/no, no vault entry for "${resolved.key}"` : "no answer available for yes/no question" });
        continue;
      }
      const want = truthyYes(resolved.value) ? "Yes" : (/^\s*(no|false|0)\s*$/i.test(String(resolved.value)) ? "No" : null);
      if (!want) { manual.push({ label, reason: `answer "${resolved.value}" is not yes/no — review manually` }); continue; }
      try {
        await entry.locator("button", { hasText: new RegExp(`^\\s*${want}\\s*$`) }).first().click({ timeout: 5000 });
        filled.push({ label, value: want });
      } catch (err) {
        manual.push({ label, reason: `yes/no click failed: ${err.message}` });
      }
      continue;
    }

    // --- Combobox typeahead (location, how did you hear) ---
    if (comboCount >= 1) {
      seen.add(label);
      const resolved = resolveFieldValue({ label, groupLabel: label, type: "combobox" }, draft, opts);
      if (resolved.value == null) {
        manual.push({ label, reason: resolved.source === "vault" ? `sensitive dropdown, no vault entry for "${resolved.key}"` : "no answer available for dropdown" });
        continue;
      }
      const input = entry.locator("[role='combobox']").first();
      const readOptions = () => page.locator("[role='option']").allTextContents()
        .then((a) => a.map((s) => s.trim()).filter(Boolean)).catch(() => []);
      try {
        await input.click({ timeout: 5000 });
        await page.waitForTimeout(300);
        // Ashby opens the listbox on ArrowDown, not on click. Read the static
        // option list FIRST (before typing — typing filters a fixed list down to
        // nothing when no option literally contains the answer, e.g. "Company
        // website" vs "Jobber Careers Site").
        await input.press("ArrowDown").catch(() => {});
        await page.waitForTimeout(500);
        let opts2 = await readOptions();
        // Pure typeahead (location places lookup): no static list — type to load.
        if (!opts2.length) {
          await input.type(String(resolved.value), { delay: 20 });
          await page.waitForTimeout(900);
          opts2 = await readOptions();
        }
        const want = resolved.key === "referral_source"
          ? pickReferralOption(opts2, resolved.value, opts.company)
          : closestOption(opts2, resolved.value);
        if (!want) {
          manual.push({ label, reason: `no dropdown option matched "${resolved.value}"${opts2.length ? ` (options: ${opts2.join(", ")})` : " (no options loaded)"}` });
          await page.keyboard.press("Escape").catch(() => {});
          continue;
        }
        await page.locator("[role='option']", { hasText: new RegExp(`^\\s*${want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }).first().click({ timeout: 5000 });
        filled.push({ label, value: want });
      } catch (err) {
        manual.push({ label, reason: `dropdown select failed: ${err.message}` });
        await page.keyboard.press("Escape").catch(() => {});
      }
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
