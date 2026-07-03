# Career-Ops

**An agentic job-search pipeline: a cloud agent discovers and grades roles every day, an on-prem pipeline drafts tailored applications, and a human approves every submission from Slack.**

Job boards use AI to filter candidates. This is the other side of that table. It's AI that helps a *candidate* choose companies, do it with quality instead of spray-and-pray, and keep a person in control of every decision that matters.

It is built as a real distributed system: a scheduled **cloud orchestrator** (Vercel `eve`, Claude via the AI Gateway) that scans portals and grades each posting, and an **on-prem pipeline** (Node.js) that turns high-fit reports into tailored CVs and cover letters. Every one passes an LLM-as-judge quality gate and a no-fabrication check before a human approves it in Slack. Nothing is ever auto-submitted.

> **This is a filter, not a firehose.** The system exists to surface the few roles worth real effort out of hundreds, and it recommends *against* applying to anything scoring below 4.0/5. Your time and the recruiter's time are both worth protecting.

---

## How it works, from a user's point of view

The whole thing is designed around one loop: **discover → grade → draft → *you* approve → learn.** You interact with it mostly through Slack and a paste-a-URL command; the machinery stays out of the way.

| Phase | What happens | You do |
|---|---|---|
| **1 · Setup** | Add your CV and a short profile (roles, comp, location, deal-breakers). The system reads these at evaluation time. They are its source of truth, never hard-coded. | ~30 min, once |
| **2 · Discover** | A cloud agent scans your portals every day at noon (or on demand via `/scan` in Slack). Zero-token discovery that hits Greenhouse/Ashby/Lever APIs directly. | Nothing |
| **3 · Grade** | Each new posting is graded A–G (fit, comp, growth, legitimacy…) into a written report and scored `/5`, then routed by score into a lane. | Read the report |
| **4 · Draft** | High-fit roles get a tailored CV + cover letter, auto-checked for quality and grounded against your real experience. Forms are pre-filled from a secured vault; tricky questions are flagged for you. | Review |
| **5 · Approve** | The filled application is posted to Slack with a single-use, 12-hour token. **It submits only after you reply to approve**, and even then only if you've turned live-apply on. | One tap |
| **6 · Learn** | Every decision (apply / skip / outcome) feeds pattern analysis so the next cycle targets better. | Occasionally |

📊 **The full visual walkthrough is in [`docs/user-journey.html`](https://gwndrlng.github.io/career-ops-ca/user-journey.html).** Open it in a browser for the phase-by-phase experience, feedback loops, and timeline.

Prefer to drive it by hand? Paste any job URL or description and the pipeline evaluates it on the spot.

---

## Architecture

Two planes, one contract. The cloud does **discovery + grading** unattended; on-prem does everything that touches your identity, your credentials, and the submit button. The only thing that crosses the boundary is a **report**, delivered over Slack. Read it top-down: **Level 0** is the two-plane boundary, then drill into any stage in **Level 1**.

### Level 0 · The two planes

```
                    ┌──────────────────────── SLACK ────────────────────────┐
                    │   #job-pipeline: graded reports · flags · approvals    │
                    └─────▲──────────────────────────────────────▲──────────┘
         report / flag    │                                      │  fill summary + approve
                          │                                      │
   ┌──────────────────────┴──────────────┐   ┌──────────────────┴───────────────────────┐
   │  CLOUD · Vercel eve (Claude/Gateway) │   │  ON-PREM · watcher + career-ops pipeline  │
   │                                      │   │                                           │
   │  daily cron ─► ORCHESTRATOR          │   │  watch.mjs (polls Slack)                  │
   │                 ├─ Scanner subagent  │   │      │ new graded report                  │
   │                 │   portal APIs,     │   │      ▼                                     │
   │                 │   dedup            │   │  route-tier.mjs  (reads score /5)          │
   │                 └─ Grader subagent   │   │    ├─ ≤2.0   → SKIP (tracked, not applied) │
   │                     rubric → score,  │   │    ├─ 2.1–3.6 → generic CV → applier       │
   │                     legitimacy tier, │   │    └─ ≥3.7   → curated CV+CL (Opus)         │
   │                     writes report    │   │                    │                       │
   │                                      │   │                    ▼                       │
   │  (no PII · no submit authority ·     │   │        judge (Opus) ≥90%? ── no ─┐         │
   │   least-privilege read+format only)  │   │            │ yes                 │ revise  │
   └──────────────────────────────────────┘   │            ▼              (loop ≤2×)       │
                                               │   grounding-check (no-fabrication gate)   │
                                               │            │                              │
                                               │            ▼                              │
                                               │   applier fills form → Slack approval ────┤
                                               │   token-budget · kill-switch · audit log  │
                                               └───────────────────────────────────────────┘
```

**Boundary contract:** the cloud's only durable output is the report (Markdown + a `## Machine Summary` YAML block). On-prem is the system of record for the tracker, documents, credentials, and submissions, all flat files, all local.

### Level 1 · Drill-downs

**A · Cloud scan & grade** (`cloud/agent/**`, Vercel `eve`)

```
daily cron 12:00  /  /scan (Slack)  /  scan-now.mjs
        │
        ▼
Orchestrator ........ per-job state machine (Sonnet)
        │
        ▼
Scanner ............. portal APIs, dedup (Haiku)
        │
        ▼
Grader .............. rubric A–G, de-identified digest (Sonnet)
        │
        ▼
Format report ....... A–G + Machine Summary YAML
        │
        ▼
Post to #job-pipeline  (Vercel Connect bot token)
```

**B · On-prem tier routing** (`pipeline/route-tier.mjs`)

```
watch.mjs (polls Slack)
        │
        ▼
gates: legitimacy · blocklist · duplicate · ≤8/day
        │
        ▼
route-tier.mjs  (score /5)
        │
   ┌────┴──────────────────┬─────────────────────────┐
   ▼ score ≤ 2.0           ▼ 2.1 – 3.6               ▼ ≥ 3.7
 SKIP                    Generic CV                Curated CV + cover
 tracked, logged,        → applier → vault         Opus 4.8
 not applied             → Slack approval          → quality gate (C)
```

**C · Quality-gate loop** (≥ 3.7 lane)

```
Draft CV + cover  (modes/cover.md, Opus 4.8) ◄──────────┐
        │                                                │
        ▼                                                │ revise & re-judge
Judge  (blind score 0–100%, separate Opus)               │ (< 90%, attempt < 3)
        ├────────────────────────────────────────────────┘
        ├──► 3rd still < 90%  → flag: best attempt + feedback
        │ ≥ 90%
        ▼
Grounding check  (every claim traced to cv.md)
        ├──► ungrounded       → back to draft
        │ pass
        ▼
Human approval  (Slack, single-use 12h token)  → submit
```

**D · Budget guardrail** (`opus-call.mjs → callOpus()`, single chokepoint)

```
callOpus(prompt, lane, {jobId})    every Opus call; nothing calls claude -p directly
        │
        ▼
Gate BEFORE spend  (token-budget.mjs: sum 4 windows)
        │
        ├──► any ceiling breached → audit budget.halt → ok:false, no tokens spent
        │ under all ceilings
        ▼
Spend  (claude -p, Opus 4.8)
        │
        ▼
Record AFTER  (append cost to ledger, job-scoped)
        │
        ▼
return ok:true + cost
```

The prose below expands each level: **Orchestration** covers A and B, **Evals & quality gates** covers C, and **Guardrails & governance** covers D.

### Orchestration
- **Cloud orchestrator + subagents** (Vercel `eve`): a scheduled daily agent owns a per-job state machine and delegates to two specialized subagents. A **Scanner** (Haiku, cheap, tool-only portal fetches) handles discovery, and a **Grader** (Sonnet) applies the scoring rubric. Subagents don't inherit parent tools, so each carries only the least privilege it needs.
- **On-prem tier router** (`pipeline/route-tier.mjs`): parses the report's machine summary, then dispatches one of three lanes by score. Every lane writes a tracker row through a merge step and never edits the tracker directly, so concurrent lanes can't corrupt state.
- **Triggers:** daily Vercel Cron, an on-demand `/scan` Slack slash command, and a terminal `scan-now.mjs`, all hitting the same pipeline.

### Evals & quality gates
- **LLM-as-judge** (`pipeline/judge.mjs`, Opus 4.8): every generated CV/cover letter is blind-scored 0–100% on JD-keyword coverage, factual grounding, tone, and structure. Below 90% triggers a **revise-and-re-judge loop, up to two retries**; a third failure flags a human instead of shipping something mediocre.
- **No-fabrication gate** (`pipeline/grounding-check.mjs`): a hard pass/block check that traces every skill, metric, and claim in the generated documents back to your real CV. Ungrounded content is *blocked*, not merely scored down.
- **Calibration spot-check** (`pipeline/calibrate.mjs`): periodically re-grades a cloud-graded job on-prem with the same rubric and flags drift beyond a threshold. It's a cheap way to catch the cloud grader silently miscalibrating.
- **Prompt & rubric versioning** (`pipeline/prompt-version.mjs`): every recorded score is stamped with the exact prompt version + content hash that produced it, and a drift detector fires if a prompt changes without a version bump. Scores stay traceable and comparable over time.

### Guardrails & governance
Every threshold lives in one auditable config (`config/guardrails.yml`), so changing a cap is a reviewable diff, never a code edit.
- **Cost governance** (`pipeline/token-budget.mjs`): four ceilings (rolling 5h, weekly, monthly-spend, and a hard per-application cap) gate *before* each Opus call and record *after* it, through a single chokepoint. When a cap trips, the run halts and offers a Slack **override** (bounded, approver-bound) or **defer-to-next-cycle**. It's a stop, not a dead end.
- **Volume caps:** ≤8 applications/day, ≤2 per company/week, enforced in the router so a routing bug can't blast forms.
- **Change control:** a config-change logger, an accepted-risk register ([`docs/RISK_REGISTER.md`](docs/RISK_REGISTER.md)) with explicit revisit triggers, and a full re-architecture design doc ([`docs/RE_ARCHITECTURE.md`](docs/RE_ARCHITECTURE.md)).
- **Fail-open vs fail-closed, on purpose:** the budget gate and kill switch fail *closed* (unclear state must stop spend/work); the audit log fails *open* (observability must never break the thing it observes).

### Security
- **Least-privilege boundary:** the cloud holds **no PII and no submit credentials.** The grader sees a de-identified candidate digest, never your real CV. Slack tokens, portal logins, and sensitive answers live only in the on-prem **macOS Keychain**.
- **Untrusted-input handling:** job-posting text is treated as data, not instructions, at every hop. `pipeline/sanitize-jd.mjs` strips invisible/bidi/control characters and neutralizes prompt-injection patterns ("ignore previous instructions", "score 5.0", "submit now") before any model call.
- **Secured answer vault** (`pipeline/vault.mjs`): work-authorization, salary, and EEO fields are filled *only* from pre-approved Keychain entries, so a value is never invented. Any field without a vault entry is flagged for manual entry.

### Human-in-the-loop & observability
- **Nothing auto-submits.** The applier fills forms, screenshots them, and stops at a Slack approval gate. Submission requires a verified approver replying with a **single-use, 12-hour-expiring token**. Live-apply is **off by default** (shadow mode), so the pipeline is safe to run before you ever flip it on.
- **Kill switch** (`pipeline/kill-switch.mjs`): `pause`/`resume` from Slack, plus auto-pause after N consecutive failures.
- **Audit log** (`pipeline/audit.mjs`): one append-only row per accountable event (every route, gate, approval, pause, and budget halt), so "why did nothing get drafted for job 231?" has a one-line answer.
- **Spend summaries:** each run posts a 🧾 token + notional-cost summary to Slack.

> Want the full end-to-end reasoning for one guardrail? [`docs/RE_ARCHITECTURE.md`](docs/RE_ARCHITECTURE.md) walks the Opus budget gate from problem to design to honest limitations, with sequence diagrams.

---

## Quick start

```bash
git clone https://github.com/GwnDrlng/career-ops-ca.git
cd career-ops-ca && npm install
npx playwright install chromium   # only needed for PDF/form automation
claude                            # or your AI CLI of choice
```

On first launch the system checks what's set up (`node doctor.mjs --json`) and, if anything's missing, walks you through it by chatting to gather your CV, a short profile, and your target roles. Nothing to hand-edit.

The core skill is CLI-agnostic (Claude Code, Gemini, Codex, OpenCode, Qwen). The **cloud agent** and **on-prem pipeline** are the additions that make it a scheduled, human-gated, production-style system rather than a one-off assistant. See [`cloud/`](cloud/), [`pipeline/`](pipeline/), and [`watcher/`](watcher/).

### Everyday use

```
paste a job URL / JD   → full auto-pipeline (evaluate → report → tracker)
/career-ops scan       → scan portals for new roles
/scan  (in Slack)      → trigger a cloud scan on demand
/career-ops pdf        → generate an ATS-optimized CV
/career-ops cover      → draft a tailored cover letter
/career-ops tracker    → application-status overview
/career-ops apply      → fill an application form (human-gated)
```

---

## Project structure

```
career-ops-ca/
├── cloud/                  # Vercel eve agent (orchestrator + scanner/grader subagents, TypeScript)
│   └── agent/
│       ├── agent.ts        #   root config (Claude via AI Gateway)
│       ├── schedules/      #   daily-scan cron
│       ├── subagents/      #   scanner (Haiku) + grader (Sonnet, rubric)
│       ├── channels/       #   Slack via Vercel Connect (no manual bot token)
│       └── tools/          #   portal fetches, report formatting, post-to-Slack
├── watcher/                # on-prem daemons (launchd)
│   ├── watch.mjs           #   polls Slack for new graded reports
│   └── approval-consumer.mjs  # handles approve / pause / resume / budget-override
├── pipeline/               # on-prem lanes, gates, and guardrails (21 modules)
│   ├── route-tier.mjs      #   score → lane dispatch
│   ├── applier.mjs         #   Playwright form-fill, stops at approval gate
│   ├── judge.mjs           #   LLM-as-judge quality gate (Opus)
│   ├── grounding-check.mjs #   no-fabrication gate
│   ├── token-budget.mjs    #   four cost/usage ceilings
│   ├── kill-switch.mjs · approval.mjs · vault.mjs · sanitize-jd.mjs
│   ├── audit.mjs · calibrate.mjs · config-guard.mjs · prompt-version.mjs · …
├── config/                 # guardrails.yml, blocklist.yml, prompt-versions.yml, profile.yml
├── modes/                  # skill "mode" prompts (evaluate, apply, cover, scan, …)
├── templates/              # ATS CV template, scanner config, canonical states
├── data/                   # tracker, ledgers, audit log (gitignored)
├── reports/                # evaluation reports (gitignored)
└── docs/
    ├── user-journey.html   # visual, phase-by-phase user experience
    ├── RE_ARCHITECTURE.md  # full design doc for the cloud + on-prem re-architecture
    └── RISK_REGISTER.md    # accepted risks with revisit triggers
```

## Tech stack

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel_eve-000?style=flat&logo=vercel&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-000?style=flat&logo=anthropic&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=flat&logo=slack&logoColor=white)

- **Cloud:** Vercel `eve` (filesystem-first TS agent framework) · Cron schedules · subagents · Slack via Vercel Connect · Claude routed through the Vercel AI Gateway
- **On-prem:** Node.js (`.mjs`) pipeline · Opus 4.8 for the highest-stakes judging/drafting · Playwright for form automation · macOS Keychain for secrets · launchd for the daemons
- **Data:** flat files (Markdown tracker + reports, YAML config, TSV ledgers). No database; state is auditable in `git`/plain text.

---

## Ethics & safety

- **Quality over quantity.** A well-targeted application to 5 companies beats a generic blast to 50. The system discourages low-fit applications and never spams.
- **You have the final call.** The AI evaluates, drafts, and fills, but it never submits. Always review before approving.
- **Your data stays yours.** CV, contacts, and credentials never leave your machine; the cloud plane runs on a de-identified digest. See [`LEGAL_DISCLAIMER.md`](LEGAL_DISCLAIMER.md).

## Credits & license

Built on the open-source [`career-ops`](https://github.com/santifer/career-ops) skill by [santifer](https://santifer.io), which provides the base evaluation modes, scoring rubric, and CLI skill. This fork adds the cloud + on-prem agentic re-architecture (scheduled orchestration, LLM-as-judge quality gates, cost/safety guardrails, Slack human-in-the-loop, and observability) documented in [`docs/RE_ARCHITECTURE.md`](docs/RE_ARCHITECTURE.md).

Code is licensed under [MIT](LICENSE). The "career-ops" name and brand are governed by the upstream [Trademark Policy](TRADEMARK.md).
