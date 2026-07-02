// gates.mjs — shared safety gates used at two pipeline stages: route-tier.mjs
// (evaluation time) and applier.mjs (apply time, where volume caps and the
// duplicate guard must be re-checked because state may have changed since
// evaluation). Centralized here so both stages apply identical logic.

import fs from "node:fs";

export function legitimacyGate(legitimacyTier, guardrails) {
  if (legitimacyTier && guardrails.legitimacy_gate.drop.includes(legitimacyTier)) {
    return { blocked: true, reason: `legitimacy_gate: "${legitimacyTier}" is on the drop list` };
  }
  return { blocked: false };
}

export function blocklistGate(company, blocklist) {
  const companyLower = company.toLowerCase();
  const groups = [
    ["current_employer", blocklist.current_employer],
    ["in_process", blocklist.in_process],
    ["opt_outs", blocklist.opt_outs],
  ];
  for (const [group, entries] of groups) {
    if (!entries) continue;
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) {
      const name = (entry?.name || "").toLowerCase();
      if (name && (companyLower.includes(name) || name.includes(companyLower))) {
        return { blocked: true, reason: `blocklist.${group}: matched "${entry.name}"` };
      }
    }
  }
  return { blocked: false };
}

export function duplicateGuard(company, role, trackerPath = "data/applications.md", statusFilter = null) {
  if (!fs.existsSync(trackerPath)) return { blocked: false };
  const tracker = fs.readFileSync(trackerPath, "utf8");
  const companyLower = company.toLowerCase();
  const roleLower = (role || "").toLowerCase();
  const rowRegex = /^\|\s*\d+\s*\|[^|]*\|\s*([^|]+)\|\s*([^|]+)\|\s*[^|]*\|\s*([^|]+)\|/gm;
  let m;
  while ((m = rowRegex.exec(tracker))) {
    const [, rowCompany, rowRole, rowStatus] = m;
    if (rowCompany.trim().toLowerCase() !== companyLower || rowRole.trim().toLowerCase() !== roleLower) continue;
    if (statusFilter && rowStatus.trim().toLowerCase() !== statusFilter.toLowerCase()) continue;
    return { blocked: true, reason: `${company} / ${role} already tracked (status: ${rowStatus.trim()})` };
  }
  return { blocked: false };
}

export function volumeCapStatus(company, guardrails, trackerPath = "data/applications.md") {
  if (!fs.existsSync(trackerPath)) {
    return { ok: true, applied_today: 0, applied_this_week_this_company: 0, caps: guardrails.volume_caps };
  }
  const tracker = fs.readFileSync(trackerPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rowRegex = /^\|\s*\d+\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|[^|]*\|\s*([^|]+)\|/gm;
  let appliedToday = 0;
  let appliedThisWeekThisCompany = 0;
  let m;
  while ((m = rowRegex.exec(tracker))) {
    const [, date, rowCompany, , status] = m;
    if (status.trim().toLowerCase() !== "applied") continue;
    if (date.trim() === today) appliedToday++;
    if (rowCompany.trim().toLowerCase() === company.toLowerCase() && Date.parse(date.trim()) >= weekAgo) {
      appliedThisWeekThisCompany++;
    }
  }
  const caps = guardrails.volume_caps;
  return {
    ok: appliedToday < caps.max_applications_per_day && appliedThisWeekThisCompany < caps.max_applications_per_company_per_week,
    applied_today: appliedToday,
    applied_this_week_this_company: appliedThisWeekThisCompany,
    caps,
  };
}

export function atsFromUrl(url, guardrails) {
  const host = new URL(url).hostname;
  const known = {
    "greenhouse.io": "greenhouse",
    "job-boards.greenhouse.io": "greenhouse",
    "boards.greenhouse.io": "greenhouse",
    "jobs.ashbyhq.com": "ashby",
    "jobs.lever.co": "lever",
    "apply.workable.com": "workable",
  };
  const ats = Object.entries(known).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] || null;
  return { ats, allowed: ats != null && guardrails.auto_fill_scope.ats_allowlist.includes(ats) };
}
