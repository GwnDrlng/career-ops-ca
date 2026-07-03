# Accepted-Risk Register — Career-Ops Re-Architecture

Part 7F of the governance layer (see `RE_ARCHITECTURE.md`). This is the honest ledger of what the system does *not* fully guarantee — known limitations that were consciously accepted rather than silently shipped. Each entry states the risk, why it's tolerable today, what mitigates it, and the trigger that should force a revisit.

**Severity** = impact if it bites. **Likelihood** = how often it plausibly bites in normal use. **Posture**: `Accepted` (living with it), `Mitigated` (reduced, residual remains), `Deferred` (will build later).

| ID | Risk | Severity | Likelihood | Posture |
|----|------|----------|------------|---------|
| R1 | Cost caps account **post-hoc** — block the *next* call, not the overshooting one | Low–Med | Med | Accepted |
| R2 | Applier `--submit` path built but **never exercised live**; live apply is now on (`apply_enabled: true`) | Med | Low | Mitigated |
| R3 | Cloud cross-run **dedup** — now Vercel Blob-backed (persists across redeploys); residual: single-store dependency | Low | Low | Mitigated |
| R4 | `sanitize-jd` is **heuristic**, not an exhaustive prompt-injection defense | Med | Low | Mitigated |
| R5 | Cloud `post_to_slack` via Connect — verified live (2026-07-02); residual: split-token (Connect message + `SLACK_BOT_TOKEN` file upload) | Low | Low | Mitigated |
| R6 | Slack actions are **text commands**, authorized by Slack user id (no request-signature check) | Med | Low | Accepted |
| R7 | Token/cost ceilings now **set to estimates** for this deploy — still unverified against the real plan allowance | Med | Med | Mitigated |
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
`applier.mjs --submit` (re-verify token → re-run gates → re-fill → click submit) is implemented but has **never run against a real form**. As of 2026-07-02 `apply_enabled: true` (shadow mode off) — the applier now fills real forms and posts approval requests — but no live *submit* has been driven yet.
- **Why tolerable:** even with `apply_enabled: true`, a submit is impossible without a Slack `approve <token>` from a verified approver, so the ethical rule (human reviews before submit) still holds by construction; the fill phase never clicks submit.
- **Mitigation:** single-use/expiring/verified-approver gate in front of every submit; liveness + all gates re-checked at submit time; `apply_enabled` can be flipped back to `false` to re-enter full shadow mode.
- **Revisit before:** first live submit — do a supervised, headed run against one real posting and confirm the confirmation/tracker write.

## R3 — Cloud dedup persistence
`cloud/agent/lib/dedup.ts` is now **Vercel Blob-backed** (2026-07-02), so cross-run dedup survives cold starts and redeploys — the earlier in-memory placeholder (which reset on every redeploy and could re-grade/re-post a posting) is gone. Residual risk: dedup now depends on a single external store (Blob) being reachable and consistent.
- **Why tolerable:** the on-prem side still has its own duplicate guard (`gates.mjs` `duplicateGuard` against `data/applications.md`), so even a Blob miss won't produce a duplicate *application*; SKIP rows recorded on-prem also let re-scans dedup after any cloud store gap.
- **Mitigation:** Blob persistence is the primary dedup; on-prem duplicate guard + SKIP-tracking is the backstop; scan-history TSV persists on-prem.
- **Revisit if:** Blob latency/consistency causes duplicate Slack reports → consider KV/Postgres or a read-through cache.

## R4 — sanitize-jd is heuristic
`sanitize-jd.mjs` strips invisible/bidi chars, defuses code fences, and neutralizes known injection phrases by regex. It is defense-in-depth, not a proof.
- **Why tolerable:** it complements prompt-level "untrusted data" framing at every hop, and the cloud grader is least-privilege by construction (read-only scrape + structured output, no submit/post capability of its own).
- **Mitigation:** layered — code filter + prompt framing + least-privilege tools; a successful injection into the grader still can't submit or exfiltrate.
- **Revisit if:** a novel injection pattern lands → extend patterns and/or add a model-based classifier pass.

## R5 — Cloud Slack post via Connect
`post_to_slack.ts` calls `connectSlackCredentials(...)` from a plain tool. This is now **verified live** (2026-07-02 scans): the compact header posts via the Connect-brokered bot token, and the full-report `.md` file uploads via `SLACK_BOT_TOKEN` (the `career-ops-ca` bot) because the managed Connect connector's scopes lack `files:write`. A `botToken` resolve bug found during that verification was fixed. Residual risk: the split-token arrangement depends on `SLACK_BOT_TOKEN` staying provisioned and scoped for `files:write` in Vercel env.
- **Why tolerable:** the round-trip is exercised and the on-prem watcher tolerates missing/duplicate posts (checkpointed, idempotent report handling); a missing file token degrades to the header-only message, which the watcher can still act on.
- **Mitigation:** documented in `channels/slack.ts` + `post_to_slack.ts`; idempotent watcher ingestion; split-token fallback path.
- **Revisit if:** `files:write` becomes available on the managed connector → collapse back to a single Connect token.

## R6 — Slack authorization is by user id, not signature
On-prem consumers **poll** Slack with a bot token and authorize control commands (`approve`, `budget-override`, `budget-defer`, `/pause`) by matching `message.user` against `approval.verified_approver_ids`. There is no request-signature verification (there's no inbound webhook to sign).
- **Why tolerable:** acting requires posting *into a private, restricted-membership channel* as a verified user — i.e. a Slack account compromise, which is outside this system's threat model and would compromise far more than this tool.
- **Mitigation:** private `#job-approvals` channel; single-use, expiring, approver-bound tokens; every action audited; shadow mode gates real submission regardless.
- **Revisit if:** moving to true interactive buttons → verify Slack request signatures on the interactivity endpoint.

## R7 — Ceilings set to estimates
The ceilings ship as `null` in the template (report "not configured", never halt), but **this deployment now sets working values** (2026-07-02): `rolling_5h_block_limit_tokens: 400000`, `weekly_limit_tokens: 1000000`, `cost.monthly_cap_usd: 50`, `cost.per_application_cap_usd: 2`. Residual risk: the two token limits are **estimates** for Claude Pro's windows (not API-discoverable), so they may not match the real plan allowance until tuned from usage data.
- **Why tolerable:** enforcement is now active on all four ceilings rather than off; an estimate that's slightly wrong still halts far short of runaway spend, and the monthly/per-application USD caps are notional (Pro subscription, usage-proxy) rather than a real bill.
- **Mitigation:** all four ceilings set + commented in `guardrails.yml`; `data/token-usage.tsv` accumulates real usage to tune from; manual override + defer exist for a genuine halt.
- **Revisit:** tune `*_limit_tokens` from `data/token-usage.tsv` after the ≥3.7 lane runs at volume; the *real* spend to watch is the Vercel AI Gateway bill (capped in Vercel's dashboard), not these notional caps.

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
