# Mode: cover — Cover Letter Generation

Invoked as `/career-ops cover {slug}` (slug mode), or offered automatically after PDF generation in `modes/pdf.md`'s Cover Letter Sub-flow. Produces a tailored `.docx` cover letter via `generate-cover-letter.mjs`.

This mode is interactive by design — it asks the user for the angle (why this role, what problems they'd solve, their approach, desired tone) rather than inventing it. The auto-generated `## Cover Letter Draft` in the evaluation report (see `modes/oferta.md`) is a starting point, not a finished letter.

## Full pipeline

1. **Load the draft.** Find `reports/{###}-{slug}-{date}.md` for the given slug and read its `## Cover Letter Draft` section (Opening, Profile introduction, Key achievements, Problems placeholder, Gaps flagged, JD keywords). If no report exists for the slug, ask the user for the JD directly and skip straight to step 3.

2. **Confirm the basics.** Read `cv.md` for achievements and `config/profile.yml` for candidate name, email, LinkedIn, location, and target-role headline (used as the letter's tagline).

3. **Company research.** Do a light pass (WebSearch/WebFetch) on the company: recent news, product launches, funding, mission language. Keep it to what's directly usable in 1-2 sentences — this isn't a `deep` company-research report.

4. **Present the JD keyword list for confirmation.** Show the "JD keywords to mirror" list from the draft (or extract 8-10 if generating fresh). Let the user drop or add terms.

5. **Surface gaps.** Show the "Gaps flagged" list from the draft (domain mismatch, language requirement, start-date urgency, title mismatch). Ask the user how they want to handle each — name it plainly in the letter, omit it, or address it differently. Never paper over a real gap with a vague claim.

6. **Ask the four prompts.** These drive the actual content — do not skip or auto-answer them:
   - **Why this role/company?** What specifically pulled them to apply (beyond the generic draft opening)?
   - **What problems would you solve?** The placeholder in the draft is empty for a reason — this needs the user's own read on the company's challenges.
   - **What's your approach?** How would they tackle it, in their own words.
   - **Tone?** Direct/analytical (default, matches existing letters), warmer, more formal, or other.

7. **Draft the letter in chat first.** Compose 3-5 body paragraphs combining: the opening hook, 1-2 paragraphs translating real `cv.md` achievements (exact metrics, no invention) into the target domain, the user's problems/approach answers, and a closing line. Apply every rule in `_shared.md`'s Professional Writing & ATS Compatibility section: no em dashes or double dashes (use commas, semicolons, colons, or parentheses), no cliché phrases, vary sentence structure, prefer specifics over abstractions.

8. **Wait for approval.** Show the full drafted letter to the user. Revise based on feedback. Do not generate the `.docx` until the user explicitly approves the text.

9. **Generate the docx.** Build the content JSON per `generate-cover-letter.mjs`'s schema:
   ```json
   {
     "name": "{from profile.yml}",
     "tagline": "{target_roles headline from profile.yml}",
     "email": "{from profile.yml}",
     "linkedin": "{from profile.yml}",
     "location": "{from profile.yml}",
     "date": "{today, e.g. \"June 30, 2026\"}",
     "salutation": "{Company} Hiring Team,",
     "paragraphs": ["...", "..."],
     "close": "..."
   }
   ```
   Write it to a temp file, then run:
   ```bash
   node generate-cover-letter.mjs /tmp/cl-{candidate}-{company}.json output/cl-{candidate}-{company}-{YYYY-MM-DD}.docx
   ```
   Use the same `{candidate}` kebab-case normalization as `modes/pdf.md` (name from `config/profile.yml`, lowercased, hyphenated).

10. **Report.** Give the user the output path and file size. If the job is already in `data/applications.md`, this does not change the PDF column (that tracks the CV, not the cover letter) — just confirm the file was written.

## Notes

- This mode always outputs `.docx`. There is no separate cover-letter PDF/HTML pipeline — `.docx` is the format both the curated-CV lane (`RE_ARCHITECTURE.md` Part 4) and ad hoc `/career-ops cover` runs use.
- **Never reuse another company's letter content.** Each letter must be generated fresh from this mode's interactive flow — do not copy paragraphs from previously generated letters for a different company, even as a starting template, beyond the structural shape (opening / translated achievements / problems-approach / close).
- When this mode is driven by the automated judge retry loop (`judge.mjs`, see `RE_ARCHITECTURE.md` Part 4), steps 6-8 (the four prompts + chat approval) are replaced by the judge's specific revision feedback — the retry fixes only the flagged issues, it does not re-run the full interactive flow.
