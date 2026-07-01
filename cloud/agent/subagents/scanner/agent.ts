import { defineAgent } from "eve";

export default defineAgent({
  description: "Scans configured job portals (Greenhouse/Ashby/Lever) via direct ATS APIs and returns newly-seen postings that match the title filter. Excludes anything already reported in a previous run.",
  model: "anthropic/claude-haiku-4.5",
  outputSchema: {
    type: "object",
    properties: {
      newPostings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            title: { type: "string" },
            url: { type: "string" },
            description: { type: "string" },
          },
          required: ["company", "title", "url", "description"],
        },
      },
      companiesScanned: { type: "number" },
    },
    required: ["newPostings", "companiesScanned"],
  },
});
