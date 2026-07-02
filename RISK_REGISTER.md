# Accepted-Risk Register — Career-Ops Re-Architecture

Part 7F of the governance layer (see `RE_ARCHITECTURE.md`). This is the honest ledger of what the system does *not* fully guarantee — known limitations that were consciously accepted rather than silently shipped. Each entry states the risk, why it's tolerable today, what mitigates it, and the trigger that should force a revisit.

**Severity** = impact if it bites. **Likelihood** = how often it plausibly bites in normal use. **Posture**: `Accepted` (living with it), `Mitigated` (reduced, residual remains), `Deferred` (will build later).

| ID | Risk | Severity | Likelihood | Posture |
|----|------|----------|------------|---------|
| R1 | Cost caps account **post-hoc** — block the *next* call, not the overshooting one | Low–Med | Med | Accepted |
| R2 | Applier `--submit` path built but **never exercised live**; shadow mode is the default | Med | Low | Mitigated |
| R3 | Cloud cross-run **dedup is in-memory** — resets on cold start / redeploy | Low | Med | Deferred |
| R4 | `sanitize-jd` is **heuristic**, not an exhaustive prompt-injection defense | Med | Low | Mitigated |
| R5 | Cloud `post_to_slack` via Connect is **unverified against a live destination** | Med | Med | Deferred |
| R6 | Slack actions are **text commands**, authorized by Slack user id (no request-signature check) | Med | Low | Accepted |
| R7 | Token/cost ceilings are **null by default** — no enforcement until the operator sets real numbers | Med | Med | Accepted |
| R8 | Prompt/rubric versioning pins **our artifacts**, not the **upstream model** | Low | Med | Accepted |
| R9 | Defer auto-resume is **poll-driven** — resumes at-or-after the cron time, not exactly on it | Low | Low | Accepted |
| R10 | Form extraction / liveness use **generic selectors**, not per-ATS tuning | Low | Med | Deferred |

---

## R1 — Post-hoc cost accounting
`claude -p` reports `total_cost_usd` only after a call returns, so `token-budget.mjs` can block the *next* Opus call once a ceiling is crossed, but never the single call that tips it over.
- **Why tolerable:** the monthly cap has a 75% ceiling (built-in headroom); one call of overshoot against a monthly pool is negligible. The per-application cap is tighter but still bounds total spend to one call past the line.
- **Mitigation:** percentage ceiling on the monthly cap; hard cap on per-application; every halt + override is audited.
- **Revisit if:** a single Opus call can cost enough that one overshoot matters → add a pre-call token-count estimate to block proactively.

## R2 — Applier submit path unexercised
`applier.mjs --submit` (re-verify token → re-run gates → re-fill → click submit) is implemented but has never run against a real form, and `apply_enabled` defaults to `false` (full shadow mode — no browser launch).
- **Why tolerable:** nothing can submit live until the operator explicitly flips `apply_enabled` after a dry run; the ethical rule (human reviews before submit) holds by construction.
- **Mitigation:** shadow-mode default; single-use/expiring/verified-approver gate in front of every submit; liveness + all gates re-checked at submit time.
- **Revisit before:** flipping `apply_enabled: true` — do a supervised, headed dry run against one real posting first.

## R3 — Cloud dedup is in-memory
`cloud/agent/lib/dedup.ts` is an in-memory placeholder; it resets on every cold start / redeploy, so the same posting can be re-graded and re-posted after a deploy.
- **Why tolerable:** the on-prem side has its own duplicate guard (`gates.mjs` `duplicateGuard` against `data/applications.md`), so a re-graded job won't produce a duplicate application.
- **Mitigation:** on-prem duplicate guard is the real backstop; scan-history TSV persists on-prem.
- **Revisit if:** duplicate Slack reports become noisy → back dedup with Vercel KV / Upstash / Postgres (decision still open).

## R4 — sanitize-jd is heuristic
`sanitize-jd.mjs` strips invisible/bidi chars, defuses code fences, and neutralizes known injection phrases by regex. It is defense-in-depth, not a proof.
- **Why tolerable:** it complements prompt-level "untrusted data" framing at every hop, and the cloud grader is least-privilege by construction (read-only scrape + structured output, no submit/post capability of its own).
- **Mitigation:** layered — code filter + prompt framing + least-privilege tools; a successful injection into the grader still can't submit or exfiltrate.
- **Revisit if:** a novel injection pattern lands → extend patterns and/or add a model-based classifier pass.

## R5 — Cloud Slack post via Connect unverified
`post_to_slack.ts` calls `connectSlackCredentials(...)` from a plain tool to post the report verbatim; the docs only demonstrate this inside a channel file, so it's untested against a live Connect destination.
- **Why tolerable:** the cloud is not deployed yet; this is on the critical path for the first real deploy, not for the built-and-tested local state.
- **Mitigation:** documented explicitly in `channels/slack.ts`; the on-prem watcher tolerates missing/duplicate posts (checkpointed, idempotent report handling).
- **Revisit before:** first production deploy — verify one real round-trip.

## R6 — Slack authorization is by user id, not signature
On-prem consumers **poll** Slack with a bot token and authorize control commands (`approve`, `budget-override`, `budget-defer`, `/pause`) by matching `message.user` against `approval.verified_approver_ids`. There is no request-signature verification (there's no inbound webhook to sign).
- **Why tolerable:** acting requires posting *into a private, restricted-membership channel* as a verified user — i.e. a Slack account compromise, which is outside this system's threat model and would compromise far more than this tool.
- **Mitigation:** private `#job-approvals` channel; single-use, expiring, approver-bound tokens; every action audited; shadow mode gates real submission regardless.
- **Revisit if:** moving to true interactive buttons → verify Slack request signatures on the interactivity endpoint.

## R7 — Ceilings null by default
`token_budget.*_limit_tokens`, `cost.monthly_cap_usd`, and `cost.per_application_cap_usd` all default to `null`. Until set, those gates report "not configured" and never halt.
- **Why tolerable:** the real allowances depend on the operator's specific Claude plan (not API-discoverable) and their budget; a wrong hard-coded default would be worse than an explicit opt-in.
- **Mitigation:** clearly commented in `guardrails.yml`; `check`/`gate` surface "not configured"; the manual override + defer exist for when they *are* set.
- **Revisit:** set real numbers before running the ≥3.7 lane at volume.

## R8 — Versioning pins our artifacts, not the model
`prompt-version.mjs` pins the rubric/prompt bytes (`<version>+<hash>`), but an upstream change to `claude-opus-4-8` / the gateway model could shift scores with no local diff.
- **Why tolerable:** model ids are pinned explicitly; the calibration spot-check (R-adjacent) is the detector for *any* grading drift, model-caused or not.
- **Mitigation:** explicit model ids; calibration flags drift > 0.4/5 regardless of cause; drift audited.
- **Revisit if:** calibration drift spikes with no prompt change → suspect the model, record the model id alongside the score.

## R9 — Defer auto-resume is poll-driven
`budget-defer` sets `pausedUntil = next daily cron`; `isPaused()` clears it on the first check *after* that time. Resume therefore happens at-or-after the cron, bounded by the poll interval, not exactly on the minute.
- **Why tolerable:** the intent is "pick back up around the next daily cycle," where minutes of lag are irrelevant.
- **Mitigation:** watcher poll interval is small (default 300s); `/resume` forces immediate restart.
- **Revisit if:** exact-time resume ever matters → schedule a wake rather than poll.

## R10 — Generic form/liveness selectors
`applier.mjs` form extraction and `liveness-browser.mjs` use best-effort generic selectors; Greenhouse/Ashby/Lever/Workable each render differently and aren't individually tuned.
- **Why tolerable:** unrecognized/curated fields are flagged for manual entry rather than mis-filled; nothing sensitive is invented; the whole path is behind shadow mode + approval.
- **Mitigation:** curated-question classifier + vault-only sensitive fields + manual-flag fallback + human approval before submit.
- **Revisit before:** relying on unattended fill at volume → add per-ATS selector profiles.

---

## How this register is maintained
- New accepted risks are added here as part of the change that introduces them (not after the fact).
- `config/guardrails.yml` changes are logged to the audit trail by `config-guard.mjs`; a change that *creates* a new risk should also land a row here.
- Each entry names a concrete **revisit trigger** so "accepted" never silently becomes "forgotten."
