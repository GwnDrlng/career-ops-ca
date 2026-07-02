// report-parse.mjs — shared report parsing (Machine Summary YAML, with
// header-field fallback for older reports). Used by route-tier.mjs and
// applier.mjs so both agree on how to read a report.

import fs from "node:fs";
import yaml from "js-yaml";

export function parseReport(reportPath) {
  const body = fs.readFileSync(reportPath, "utf8");
  const ymlMatch = body.match(/## Machine Summary\s*```yaml\n([\s\S]*?)```/);
  let summary = {};
  if (ymlMatch) {
    try {
      summary = yaml.load(ymlMatch[1]) || {};
    } catch {
      summary = {};
    }
  }

  const titleMatch = body.match(/^# Evaluation:\s*(.+?)\s*[—-]\s*(.+)$/m);
  const scoreMatch = body.match(/\*\*Score:\*\*\s*([\d.]+)\/5/);
  const legitMatch = body.match(/\*\*Legitimacy:\*\*\s*([^\n(]+)/);
  const urlMatch = body.match(/\*\*URL:\*\*\s*(\S+)/);

  return {
    body,
    company: summary.company || titleMatch?.[1]?.trim() || null,
    role: summary.role || titleMatch?.[2]?.trim() || null,
    score: summary.score != null ? Number(summary.score) : (scoreMatch ? Number(scoreMatch[1]) : null),
    legitimacyTier: summary.legitimacy_tier || legitMatch?.[1]?.trim() || null,
    url: normalizeUrl(urlMatch?.[1]),
  };
}

// The cloud posts the report through Slack, which auto-links a bare URL as
// `<https://…>` (and a labelled one as `<https://…|text>`). Strip that wrapper
// so downstream `new URL()` calls (gates.atsFromUrl, applier liveness) get a
// clean URL instead of throwing ERR_INVALID_URL.
export function normalizeUrl(raw) {
  if (!raw) return null;
  let u = raw.trim();
  const angle = u.match(/^<([^>]+)>$/);
  if (angle) u = angle[1];
  const pipe = u.indexOf("|");
  if (pipe !== -1) u = u.slice(0, pipe);
  return u.trim() || null;
}
