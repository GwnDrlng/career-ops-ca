import { defineAgent } from "eve";

export default defineAgent({
  description: "Grades a single job posting against the candidate's profile using the 1-5 weighted rubric, and assesses posting legitimacy. Returns structured scoring output.",
  model: "anthropic/claude-sonnet-4.6",
  outputSchema: {
    type: "object",
    properties: {
      score: { type: "number" },
      archetype: { type: "string" },
      legitimacyTier: { type: "string", enum: ["High Confidence", "Proceed with Caution", "Suspicious"] },
      hardStops: { type: "array", items: { type: "string" } },
      softGaps: { type: "array", items: { type: "string" } },
      topStrengths: { type: "array", items: { type: "string" } },
      riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
      confidence: { type: "string", enum: ["Low", "Medium", "High"] },
      nextAction: { type: "string" },
      dimensionNarratives: {
        type: "object",
        properties: {
          matchWithCv: { type: "string" },
          northStarAlignment: { type: "string" },
          comp: { type: "string" },
          culturalSignals: { type: "string" },
          redFlags: { type: "string" },
        },
        required: ["matchWithCv", "northStarAlignment", "comp", "culturalSignals", "redFlags"],
      },
    },
    required: ["score", "archetype", "legitimacyTier", "hardStops", "softGaps", "topStrengths", "riskLevel", "confidence", "nextAction", "dimensionNarratives"],
  },
});
