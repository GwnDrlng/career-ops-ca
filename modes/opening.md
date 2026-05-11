# Mode: opening — Complete Evaluation A-G

When the candidate pastes an opening (text or URL), ALWAYS deliver all 7 blocks (A-F evaluation + G legitimacy):

## Step -1 — Company Conflict Check

Before beginning evaluation, check `data/applications.md` and `data/pipeline.md` for other roles at the same company.

**Read applications.md and pipeline.md. Search for the same company name (case-insensitive substring match).**

### Scenario A — Active application exists (Applied/Responded/Interview in last 12 months):

> ⚠️ **Company Conflict:** You already have an active application at {Company} — {Prior Role} (status: {Status}, date: {Date}, score: {Score}).
> 
> Applying to a second role here is not recommended. Do you want to continue evaluating anyway? (y/n)

If user says **no** → stop, do not proceed to Step 0. Mark this role as "SKIP" in pipeline.md with note "Company policy: already applied to [company] recently."

If user says **yes** → proceed to Step 0.

### Scenario B — Other evaluated (but unapplied) roles exist at this company:

> 📋 **Multiple roles at {Company}:** The following roles are also in your pipeline or tracker:
> - {Role A} — Score: X.X/5, Status: Evaluated
> - {Role B} — Score: pending, Status: in pipeline
> 
> You've set a one-per-company rule. Want to: (1) Evaluate this role and compare all at the end, or (2) Skip this one for now? (1/2)

If user says **1** → proceed to Step 0 (you'll compare scores at the end and pick the best one).

If user says **2** → stop, do not proceed. Mark this role as "SKIP" in pipeline.md with note "Company policy: evaluate [best role] at [company] instead."

### Scenario C — No conflicts found:

Proceed silently with Step 0. No notice needed.

---

## Step 0 — Archetype Detection

Classify the opening into one of 6 archetypes (see `_shared.md`). If hybrid, indicate the 2 closest. This determines:
- Which proof points to prioritise in block B
- How to rewrite the summary in block E
- Which STAR stories to prepare in block F

## Block A — Role Summary

Table with:
- Detected archetype
- Domain (platform/agentic/LLMOps/ML/enterprise)
- Function (build/consult/manage/deploy)
- Seniority
- Remote (full/hybrid/onsite)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Block B — CV Match

Read `cv.md`. Create a table with each JD requirement mapped to exact CV lines.

**Adapted to archetype:**
- If FDE → prioritise fast delivery and client-facing proof points
- If SA → prioritise system design and integrations
- If PM → prioritise product discovery and metrics
- If LLMOps → prioritise evals, observability, pipelines
- If Agentic → prioritise multi-agent, HITL, orchestration
- If Transformation → prioritise change management, adoption, scaling

**Gaps** section with mitigation strategy for each one. For each gap:
1. Is it a hard blocker or a nice-to-have?
2. Can the candidate demonstrate adjacent experience?
3. Is there a portfolio project that covers this gap?
4. Concrete mitigation plan (phrase for cover letter, quick project, etc.)

## Block C — Level & Strategy

1. **Detected level** in the JD vs **candidate's natural level for that archetype**
2. **"Sell senior without lying" plan**: specific phrases adapted to the archetype, concrete achievements to highlight, how to position founder experience as an advantage
3. **"If downlevelled" plan**: accept if comp is fair, negotiate 6-month review, clear promotion criteria

## Block D — Comp & Demand

Use WebSearch for:
- Current salaries for the role (Glassdoor, Levels.fyi, Blind)
- Company's compensation reputation
- Role demand trend

Table with data and cited sources. If no data available, say so rather than inventing.

## Block E — Personalisation Plan

| # | Section | Current state | Proposed change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 CV changes + Top 5 LinkedIn changes to maximise match.

## Block F — Interview Plan

6-10 STAR+R stories mapped to JD requirements (STAR + **Reflection**):

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|--------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently. This signals seniority — junior candidates describe what happened, senior candidates extract lessons.

**Story Bank:** If `interview-prep/story-bank.md` exists, check if any of these stories are already there. If not, append new ones. Over time this builds a reusable bank of 5-10 master stories that can be adapted to any interview question.

**Selected and framed according to archetype:**
- FDE → emphasise fast delivery and client-facing
- SA → emphasise architecture decisions
- PM → emphasise discovery and trade-offs
- LLMOps → emphasise metrics, evals, production hardening
- Agentic → emphasise orchestration, error handling, HITL
- Transformation → emphasise adoption, organisational change

Also include:
- 1 recommended case study (which of their projects to present and how)
- Red-flag questions and how to answer them (e.g. "why did you sell your company?", "do you have a reports team?")

## Block G — Posting Legitimacy

Analyze the job posting for signals that indicate whether this is a real, active opening. This helps the user prioritise their effort on opportunities most likely to result in a hiring process.

**Ethical framing:** Present observations, not accusations. Every signal has legitimate explanations. The user decides how to weigh them.

### Signals to analyze (in order):

**1. Posting Freshness** (from Playwright snapshot, already captured in Step 0):
- Date posted or "X days ago" -- extract from page
- Apply button state (active / closed / missing / redirects to generic page)
- If URL redirected to generic careers page, note it

**2. Description Quality** (from JD text):
- Does it name specific technologies, frameworks, tools?
- Does it mention team size, reporting structure, or org context?
- Are requirements realistic? (years of experience vs technology age)
- Is there a clear scope for the first 6-12 months?
- Is salary/compensation mentioned?
- What ratio of the JD is role-specific vs generic boilerplate?
- Any internal contradictions? (entry-level title + staff requirements, etc.)

**3. Company Hiring Signals** (2-3 WebSearch queries, combine with Block D research):
- Search: `"{company}" layoffs {year}` -- note date, scale, departments
- Search: `"{company}" hiring freeze {year}` -- note any announcements
- If layoffs found: are they in the same department as this role?

**4. Reposting Detection** (from scan-history.tsv):
- Check if company + similar role title appeared before with a different URL
- Note how many times and over what period

**5. Role Market Context** (qualitative, no additional queries):
- Is this a common role that typically fills in 4-6 weeks?
- Does the role make sense for this company's business?
- Is the seniority level one that legitimately takes longer to fill?

### Output format:

**Assessment:** One of three tiers:
- **High Confidence** -- Multiple signals suggest a real, active opening
- **Proceed with Caution** -- Mixed signals worth noting
- **Suspicious** -- Multiple ghost job indicators, investigate before investing time

**Signals table:** Each signal observed with its finding and weight (Positive / Neutral / Concerning).

**Context Notes:** Any caveats (niche role, government job, evergreen position, etc.) that explain potentially concerning signals.

### Edge case handling:
- **Government/academic postings:** Longer timelines are standard. Adjust thresholds (60-90 days is normal).
- **Evergreen/continuous hire postings:** If the JD explicitly says "ongoing" or "rolling," note it as context -- this is not a ghost job, it is a pipeline role.
- **Niche/executive roles:** Staff+, VP, Director, or highly specialized roles legitimately stay open for months. Adjust age thresholds accordingly.
- **Startup / pre-revenue:** Early-stage companies may have vague JDs because the role is genuinely undefined. Weight description vagueness less heavily.
- **No date available:** If posting age cannot be determined and no other signals are concerning, default to "Proceed with Caution" with a note that limited data was available. NEVER default to "Suspicious" without evidence.
- **Recruiter-sourced (no public posting):** Freshness signals unavailable. Note that active recruiter contact is itself a positive legitimacy signal.

---

## Post-Evaluation

**ALWAYS** after generating blocks A-G:

### 1. Save report .md

Save the complete evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = next sequential number (3 digits, zero-padded)
- `{company-slug}` = company name in lowercase, no spaces (use hyphens)
- `{YYYY-MM-DD}` = current date

**Report format:**

```markdown
# Evaluation: {Company} — {Role}

**Date:** {YYYY-MM-DD}
**Archetype:** {detected}
**Score:** {X/5}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {path or pending}

---

## A) Role Summary
(full block A content)

## B) CV Match
(full block B content)

## C) Level & Strategy
(full block C content)

## D) Comp & Demand
(full block D content)

## E) Personalisation Plan
(full block E content)

## F) Interview Plan
(full block F content)

## G) Posting Legitimacy
(full block G content)

## H) Draft Application Answers
(only if score >= 4.5 — draft answers for the application form)

---

## Extracted Keywords
(list of 15-20 keywords from JD for ATS optimisation)
```

### 2. Register in tracker

**ALWAYS** register in `data/applications.md`:
- Next sequential number
- Current date
- Company
- Role
- Score: average match (1-5)
- Status: `Evaluated`
- PDF: ❌ (or ✅ if auto-pipeline generated PDF)
- Report: relative link to the .md report (e.g. `[001](reports/001-company-2026-01-01.md)`)

**Tracker format:**

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report |
```
