# Mode: interview-prep — Company-Specific Interview Intelligence

When the user asks to prep for an interview at a specific company+role, or when an evaluation scores 4.0+ and the user updates status to `Interview`, run this mode.

## Inputs

1. **Company name** and **role title** (required)
2. **Evaluation report** in `reports/` (if exists) — read for archetype, gaps, matched proof points
3. **Story bank** at `interview-prep/story-bank.md` — read for existing prepared stories
4. **CV** at `cv.md` + `article-digest.md` — read for proof points
5. **Profile** at `config/profile.yml` + `modes/_profile.md` — read for candidate context

## Step 1 — Research

Run these WebSearch queries. Extract structured data, not summaries. Cite sources for every claim.

| Query | What to extract |
|-------|-----------------|
| `"{company} {role} interview questions site:glassdoor.com"` | Actual questions asked, difficulty rating, experience rating, process timeline, number of rounds, opening/reject ratio |
| `"{company} interview process site:teamblind.com"` | Candid process descriptions, recent data points, comp negotiation details, hiring bar |
| `"{company} {role} interview site:leetcode.com/discuss"` | Specific coding/technical problems, system design topics, round structure |
| `"{company} engineering blog"` | Tech stack, values, what they publish about, technical priorities |
| `"{company} interview process {role}"` (general) | Fills gaps from above — blog posts, YouTube, prep guides, candidate write-ups |

If the company is small or obscure and yields few results, broaden: search for the role archetype at similar-stage companies, and note that intel is sparse.

**Do NOT fabricate questions.** If a source says "they asked about distributed systems," report that. Do not invent a specific distributed systems question. When generating likely questions from JD analysis, label them clearly as `[inferred from JD]` not sourced from candidates.

## Step 2 — Process Overview

```markdown
## Process Overview
- **Rounds:** {N} rounds, ~{X} days end-to-end
- **Format:** {e.g., recruiter screen → technical phone → take-home → onsite (4 rounds) → hiring manager}
- **Difficulty:** {X}/5 (Glassdoor avg, N reviews)
- **Positive experience rate:** {X}%
- **Known quirks:** {e.g., "pair programming instead of whiteboard", "no LeetCode, all practical", "take-home is 4 hours"}
- **Sources:** {links}
```

If data is insufficient for any field, write "unknown — not enough data" rather than guessing.

## Step 3 — Round-by-Round Breakdown

For each round discovered in research:

```markdown
### Round {N}: {Type}
- **Duration:** {X} min
- **Conducted by:** {peer / manager / skip-level / recruiter — if known}
- **What they evaluate:** {specific skills or traits}
- **Reported questions:**
  - {question} — [source: Glassdoor 2026-Q1]
  - {question} — [source: Blind]
- **How to prepare:** {1-2 concrete actions}
```

If round structure is unknown, state that and provide the best available intel on what types of rounds to expect based on company size, stage, and role level.

## Step 4 — Likely Questions

Categorize all discovered and inferred questions:

### Technical
Questions about system design, coding, architecture, domain knowledge.
For each: the question, source, and what a strong answer looks like for this candidate specifically (reference CV proof points).

### Behavioral
Questions about leadership, conflict, collaboration, failure.
For each: the question, source, and which story from `story-bank.md` maps best.

### Role-Specific
Questions tied to the specific job description (archetype-aware).
For each: the question, why they're likely asking it (what JD requirement it maps to), and the candidate's best angle.

### Background Red Flags
Questions the interviewer will probably ask about gaps, transitions, or unusual elements in the candidate's background. Read `_profile.md` and `cv.md` to identify what might raise questions.
For each: the likely question, why it comes up, and a recommended framing (honest, specific, forward-looking — never defensive).

## Step 5 — Story Bank Mapping

| # | Likely question/topic | Best story from story-bank.md | Fit | Gap? |
|---|----------------------|-------------------------------|-----|------|
| 1 | ... | [Story Title] | strong/partial/none | |

- **strong**: story directly answers the question
- **partial**: story is adjacent, needs reframing
- **none**: no existing story — flag for the user

For each gap, suggest: "You need a story about {topic}. Consider: {specific experience from cv.md that could become a STAR+R story}."

If the user wants to draft missing stories, help them build STAR+R format and append to `interview-prep/story-bank.md`.

## Step 6 — Technical Prep Checklist

Based on what the company actually tests, not generic advice:

```markdown
- [ ] {topic} — why: "{evidence from research}"
- [ ] {topic} — why: "{their blog/product suggests this matters}"
- [ ] {topic} — why: "{asked in N/M recent Glassdoor reviews}"
```

Prioritize by frequency and relevance to the role. Max 10 items.

## Step 7 — Company Signals

Things to say, do, and avoid based on research:

- **Values they screen for:** name them, cite source (careers page, blog, Glassdoor reviews)
- **Vocabulary to use:** terms the company uses internally — shows homework (e.g., Stripe says "increase the GDP of the internet", Anthropic says "safety" not "alignment")
- **Things to avoid:** specific anti-patterns flagged in interview reviews
- **Questions to ask them:** 2-3 sharp questions that demonstrate you've researched the company, tied to recent news or blog posts discovered in Step 1

## Output

Save the full report to `interview-prep/{company-slug}-{role-slug}.md` with this header:

```markdown
# Interview Intel: {Company} — {Role}

**Report:** {link to evaluation report if exists, or "N/A"}
**Researched:** {YYYY-MM-DD}
**Sources:** {N} Glassdoor reviews, {N} Blind posts, {N} other
```

## Post-Research

After delivering the report:

1. Ask the user if they want to draft stories for any gaps found in Step 5
2. If they have a scheduled interview date, note it: "Your interview is in {X} days. Want me to set a reminder to review this prep?"
3. Suggest running `deep` mode if the company research in Step 1 was thin — deep mode covers strategy, culture, and competitive landscape in more depth

## Rules

- **NEVER invent interview questions and attribute them to sources.** Inferred questions must be labeled `[inferred from JD]`.
- **NEVER fabricate Glassdoor ratings or statistics.** If the data isn't there, say so.
- **Cite everything.** Every question, every stat, every claim gets a source or an `[inferred]` tag.
- Generate in the language of the JD (EN default).
- Be direct. This is a working prep document, not a pep talk.

## PM Interview Patterns

When preparing for Product Manager interviews, adapt the standard prep to include these PM-specific rounds and frameworks:

### Common PM Interview Round Types

| Round Type | What They Test | Typical Duration |
|-----------|---------------|-----------------|
| Product Sense / Product Design | Customer empathy, feature prioritization, tradeoff reasoning | 45-60 min |
| Execution / Metrics | Goal setting, metric selection, root cause analysis, experiment design | 45-60 min |
| Strategy / Behavioral | Leadership, stakeholder management, failure reflection, influence | 45-60 min |
| Technical / Estimation | Back-of-envelope sizing, system understanding, data literacy | 30-45 min |
| Case Study / Take-Home | Full product spec, PRD, or strategy document | 2-8 hours |

### PM Interview Frameworks to Prepare

1. **CIRCLES Method** (for product design): Comprehend → Identify users → Report pain points → Cut prioritization → List solutions → Evaluate tradeoffs → Summarize
2. **RESOLVED Method** (for execution/metrics): Root cause exploration → Establish metrics → Suggest experiments → Look for guardrails → Validate with data → Execute with milestones → Decision framework
3. **STAR+R** (for behavioral): Situation, Task, Action, Result, + Reflection (what you'd do differently)

### PM-Specific Questions to Anticipate

- "How would you improve [product]?" — product sense with metric reasoning
- "What metric would you use to measure [X]?" — execution framework
- "Tell me about a time you had to say no to a stakeholder" — influence without authority
- "How would you prioritize [feature list]?" — RICE, ICE, or custom framework
- "Design [product] for [user]" — end-to-end product thinking
- "What's your favorite product and why?" — product taste + articulation
- "Estimate the market size for [X] in Canada" — TAM/SAM/SOM with Canadian market context

### AI Product Manager — Specific Questions

These target the intersection of product management and AI/ML systems. Expect 2-3 of these in any AI PM or Technical PM interview:

**Non-deterministic output & product quality**
- "How would you design an AI feature that has non-deterministic output?" — Talk about evaluation datasets, acceptance thresholds, guardrails, graceful degradation, and user-facing communication about probabilistic results.
- "How do you measure success of an ML-powered product feature?" — Beyond engagement metrics: precision/recall at threshold, user trust signals (override rate, correction rate), cost per inference, time-to-value, and whether users return after first experience.
- "Your model's accuracy dropped 15% in production. Walk me through your response." — Detection (monitoring, alerts), triage (data drift? feature change? edge case?), mitigation (rollback, fallback rules, throttling), root cause, and prevention (canary deploys, shadow scoring).

**Prioritization under AI uncertainty**
- "Walk me through how you'd prioritize between improving model accuracy vs. improving UX latency." — Frame as ROI: how many users hit the accuracy threshold vs. how many bounce on latency. Use marginal improvement curves. Propose A/B testing both levers.
- "You have 3 AI feature requests from stakeholders. You can only build one. How do you decide?" — Impact × feasibility × data-readiness scoring. Key question: do we have the training data and evaluation criteria for each? If not, that feature isn't ready regardless of stakeholder pressure.
- "How do you decide when an AI feature should use a heuristic/rules-based approach vs. ML?" — Rules when: deterministic output required, small data, high-stakes domain, need for auditability. ML when: pattern complexity exceeds rule-writing capacity, sufficient training data exists, graceful degradation is acceptable.

**AI product lifecycle & stakeholder management**
- "Describe the lifecycle of an AI feature from prototype to production." — Prototype in notebooks → offline evaluation → shadow mode in production → canary release with guardrails → full rollout with monitoring → continuous evaluation → retraining triggers.
- "How do you communicate AI risk and limitations to non-technical stakeholders?" — Concrete analogies (weather forecast confidence intervals), worst-case scenario framing, preview demos with known failure modes, and setting expectations about improvement timelines.
- "Your team's AI feature made a costly mistake in production. What do you do?" — Immediate: contain the blast radius (kill switch, fallback). Short-term: incident review, customer communication. Long-term: evaluation pipeline improvement, guardrails, and process changes.

**Data & evaluation strategy**
- "How would you build an evaluation framework for a generative AI product?" — Golden datasets with human-rated examples, automated metrics (BLEU, ROUGE, BERTScore for starters), LLM-as-judge for non-grounded outputs, A/B testing with user satisfaction signals, and regression testing across model versions.
- "What's your approach to cold-start problems for AI features?" — Bootstrap with rules/heuristics, synthetic data, or transfer learning. Design for data flywheel: every user interaction labels future training data. Set explicit milestones for when ML takes over from rules.
- "How do you handle data privacy concerns when building AI products for Canadian users?" — PIPEDA compliance, data residency (Canadian servers), anonymization pipeline, consent management, and differential privacy for analytics. For Quebec: additional Bill 96 language and privacy requirements.

### Canadian PM Interview Nuances

- **Bilingual interviews**: Toronto/Vancouver are English-only. Montreal roles often require French fluency (written AND verbal). Quebec's Charter of the French Language means PM roles targeting Quebec users must operate in French.
- **Comp discussions**: Canadian PM comp is typically discussed as base + bonus + RSUs (not total comp as in US). Reference CAD figures. Equity at Canadian companies is usually smaller.
- **Work-life balance questions**: Canadian companies often value work-life balance explicitly. Asking about it in the interview is normal and not a red flag.
- **Cultural fit**: "culture add" framing is becoming more common than "culture fit" at progressive Canadian employers.
