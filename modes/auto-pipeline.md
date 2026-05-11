# Mode: auto-pipeline — Full Automatic Pipeline

When the user pastes a JD (text or URL) with no explicit sub-command, run the FULL pipeline in sequence:

## Step 0 — Extract JD

Si el input es una **URL** (no texto de JD pegado), seguir esta estrategia para extraer el contenido:

**Orden de prioridad:**

1. **Playwright (preferido):** La mayoría de portales de empleo (Lever, Ashby, Greenhouse, Workday) son SPAs. Usar `browser_navigate` + `browser_snapshot` para renderizar y leer el JD.
2. **WebFetch (fallback):** Para páginas estáticas (ZipRecruiter, WeLoveProduct, company career pages).
3. **WebSearch (last resort):** Search role title + company on secondary portals that index the JD in static HTML.

**If no method works:** Ask the candidate to paste the JD manually or share a screenshot.

**Si el input es texto de JD** (no URL): usar directamente, sin necesidad de fetch.

## Step 0b — Company Conflict Check

Before beginning evaluation, check `data/applications.md` and `data/pipeline.md` for other roles at the same company.

**Read applications.md and pipeline.md. Search for the same company name (case-insensitive substring match).**

### Scenario A — Active application exists (Applied/Responded/Interview in last 12 months):

> ⚠️ **Company Conflict:** You already have an active application at {Company} — {Prior Role} (status: {Status}, date: {Date}, score: {Score}).
> 
> Applying to a second role here is not recommended. Do you want to continue evaluating anyway? (y/n)

If user says **no** → stop, do not proceed to Step 1. Stop pipeline. Return to user with note: "Skipped {Company} — {Role} due to company policy (already applied to {Prior Role})."

If user says **yes** → proceed to Step 1.

### Scenario B — Other evaluated (but unapplied) roles exist at this company:

> 📋 **Multiple roles at {Company}:** The following roles are also in your pipeline or tracker:
> - {Role A} — Score: X.X/5, Status: Evaluated
> - {Role B} — Score: pending, Status: in pipeline
> 
> You've set a one-per-company rule. Want to: (1) Evaluate this role and compare all at the end, or (2) Skip this one for now? (1/2)

If user says **1** → proceed to Step 1 (you'll compare scores at the end and pick the best one).

If user says **2** → stop. Return to user with note: "Skipped {Company} — {Role} due to company policy. Focus on {Best Role} instead."

### Scenario C — No conflicts found:

Proceed silently to Step 1. No notice needed.

---

## Step 1 — Evaluation A-G
Execute exactly like the `opening` mode (read `modes/opening.md` for all blocks A-F + Block G Posting Legitimacy).

## Step 2 — Save Report .md
Save the complete evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md` (see format in `modes/opening.md`).
Include Block G in the saved report. Add `**Legitimacy:** {tier}` to the report header.

**Note on default scope:** Auto-pipeline creates ONLY the A-G report and updates the tracker. Derivative materials (cover letter, recruiter call prep, application form answers, interview notes) are created only on explicit user request (e.g., "draft a cover letter", "prep me for the recruiter call").

## Step 2a — Prompt: Generate Tailored CV/PDF?

After saving the report, ask the user:

> "Want me to generate a tailored CV/PDF for this role? (y/n)"

If user says **yes**, execute the full PDF pipeline:

Read `config/profile.yml`. Check `cv.output_format`:

- If `"latex"`, execute the full pipeline from `modes/latex.md`
- Otherwise (default), execute the full pipeline from `modes/pdf.md`

Mark PDF as ✅ in tracker when complete.

If user says **no**, skip PDF generation and mark PDF as ❌ in tracker.

## Step 2b — Prompt: Draft Application Answers?

After handling the PDF prompt, ask the user:

> "Want me to draft application form answers for this role? (Only recommended if score ≥ 4.5) (y/n)"

If user says **yes** and score ≥ 4.5, generate draft answers:

1. **Extract form questions:** Use Playwright to navigate to the application form and snapshot the questions. If questions cannot be extracted, use the generic questions below.

2. **Generic questions (fallback):**
   - Why are you interested in this role?
   - Why do you want to work at [Company]?
   - Tell us about a relevant project or achievement
   - What makes you a good fit for this position?
   - How did you hear about this role?

3. **Tone for answers: "I'm choosing you."** The candidate has options and is choosing this company for concrete reasons.

   **Tone rules:**
   - **Confident without arrogance**: "I've spent the past year building production AI agent systems — your role is where I want to apply that experience next"
   - **Selective without arrogance**: "I've been intentional about finding a team where I can contribute meaningfully from day one"
   - **Specific and concrete**: Always reference something REAL from the JD or company, and something REAL from the candidate's experience
   - **Direct, no fluff**: 2-4 sentences per answer. No "I'm passionate about..." or "I would love the opportunity to..."
   - **The hook is the proof, not the claim**: Instead of "I'm great at X", say "I built X that does Y"

4. **Framework per question:**
   - **Why this role?** → "Your [specific thing] maps directly to [specific thing I built]."
   - **Why this company?** → Mention something concrete about the company. "I've been using [product] for [time/purpose]."
   - **Relevant experience?** → A quantified proof point. "Built [X] that [metric]."
   - **Good fit?** → "I sit at the intersection of [A] and [B], which is exactly where this role lives."
   - **How did you hear?** → Honest: "Found through [portal/scan], evaluated against my criteria, and it scored highest."

5. **Save to report** as section `## H) Draft Application Answers` with all answers formatted clearly.

6. **Language**: Always in the language of the JD (EN default).

If user says **no** or score < 4.5, skip application answers and omit section H from the report.

## Step 3 — Update Tracker
Register in `data/applications.md` with all columns including Report and PDF status (✅ or ❌ depending on what was generated).

**Si algún paso falla**, continuar con los siguientes y marcar el paso fallido como pendiente en el tracker.
