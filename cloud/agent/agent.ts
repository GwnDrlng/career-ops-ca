import { defineAgent } from "eve";

// Root orchestrator: delegates to the scanner and grader subagents on each
// daily schedule fire, then posts graded reports to Slack. Sonnet is
// deliberately cheaper than the on-prem Opus 4.8 judge/doc-gen work (Part 4)
// -- scanning + grading is not the highest-stakes step in the pipeline
// (the judge + grounding-check gates are).
// Note: subagents.mdx (website docs) mentions a `limits.maxSubagentDepth`
// field, but the installed eve@0.17.1 PublicAgentDefinition type has no such
// field -- likely a docs/version mismatch. Omitted rather than shipping a
// config the installed version doesn't understand.
export default defineAgent({
  model: "anthropic/claude-sonnet-4.6",
});
