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
    url: urlMatch?.[1]?.trim() || null,
  };
}
