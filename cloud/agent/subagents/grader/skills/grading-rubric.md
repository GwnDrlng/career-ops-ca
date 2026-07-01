# Job Fit Grading Rubric

Ported from the on-prem `modes/_shared.md` / `modes/ofertas.md` rubric. Score every posting 1.0-5.0 across five dimensions, then compute a weighted global score. This is the same rubric the on-prem `oferta` mode uses -- keep them in sync so cloud and on-prem grades stay comparable (see RE_ARCHITECTURE.md's grading-calibration spot-check).

| Dimension | What it measures |
|-----------|-------------------|
| Match with CV | Skills, experience, proof points alignment against the candidate digest |
| North Star alignment | How well the role fits the candidate's target archetypes |
| Comp | Salary vs market, if disclosed (5=top quartile, 1=well below; if undisclosed, do not penalize -- score neutral at 3.0 for this dimension) |
| Cultural signals | Company stability, growth signals, remote/hybrid policy fit |
| Red flags | Blockers, warnings -- subtract from the weighted average, do not just average them in |
| **Global** | Weighted average of the above |

**Score interpretation:**
- 4.5+ -> Strong match
- 4.0-4.4 -> Good match
- 3.5-3.9 -> Decent but not ideal
- Below 3.5 -> Weak match

Grade against the candidate digest in `lib/candidate-digest.md`, which is de-identified (generic employer descriptions, no name/contact info). Do not treat the absence of a real name or specific employer name as a gap -- it is intentional.

## Archetype detection

Classify the role into one of the candidate's target archetypes (from the digest): B2B SaaS PM, Cybersecurity/FinTech PM, Strategy Leadership, or AI/ML Product Leader (secondary -- a positive signal, not a requirement). Note the archetype in the output.

## Posting legitimacy (separate from the 1-5 score)

The cloud scanner has no browser/page-snapshot access -- it only has the JD text and metadata from the ATS API. Assess legitimacy from what's actually available:

| Signal | Source | Reliability | Notes |
|--------|--------|-------------|-------|
| JD specificity | JD text | Medium | Generic, boilerplate JDs correlate with ghost postings but also just poor writing |
| Requirements realism | JD text | Medium | Internal contradictions (e.g. "0-2 years, must have 10 years in a tool released 3 years ago") are a strong signal |
| Salary transparency | JD text | Low | Jurisdiction-dependent; many legitimate reasons to omit |
| Role-company fit | Qualitative | Low | Subjective, supporting signal only |

Tiers: **High Confidence**, **Proceed with Caution**, **Suspicious**. Since the cloud side can't verify posting age or apply-button liveness, default to **Proceed with Caution** rather than **High Confidence** unless the JD content is unusually strong on multiple signals -- the on-prem applier re-checks liveness with Playwright immediately before ever filling a form, so the cloud tier only needs to be a reasonable first pass, not a final verdict.

**Ethical framing (mandatory):** never present legitimacy signals as accusations of dishonesty. Present signals, note legitimate explanations for concerning ones, let the downstream router and human decide.

## Output required

For each graded posting, produce: score (1.0-5.0, one decimal), archetype, legitimacy tier, hard stops (blocking gaps, empty array if none), soft gaps (non-blocking, empty array if none), top strengths (most relevant to this role), risk level (Low/Medium/High), confidence (Low/Medium/High), next action (one concrete sentence), and a short narrative for each of the five scoring dimensions (2-3 sentences each) that the report formatter will use to build the full report body.
