// portals-config.ts — cloud-side copy of the root repo's portals.yml
// tracked_companies (API-scannable entries only) and title_filter.
//
// This is a generated TS module, not a runtime YAML read, so eve's build
// tracing reliably bundles it (same category as lib/dedup.ts). Regenerate by
// hand when portals.yml changes -- not automated yet. See RE_ARCHITECTURE.md.

export interface TrackedCompany {
  name: string;
  api: string;
  enabled: boolean;
}

export const titleFilter = {
  positive: [
    "Director of Product",
    "Head of Product",
    "Chief Product Officer",
    "Senior Product Manager",
    "Senior Product Owner",
    "Staff Product Manager",
    "Group Product Manager",
    "Principal Product Manager",
    "Lead Product Manager",
    "Lead Product Owner",
    "Product Lead",
    "Product Director",
    "Product Management",
    "B2B Product",
    "Enterprise Product Manager",
    "Platform Product Manager",
    "Portfolio Product Manager",
    "Growth Product Manager",
    "Growth Product Management",
    "Revenue Product Manager",
    "AI Product Manager",
    "AI PM",
    "Product Corporate Strategy",
    "Product Strategy",
    "Head of Strategy",
    "Director of Strategy",
    "Director of Product Strategy",
    "Director of GTM Strategy",
    "Director of Revenue Strategy",
    "Head of Business Strategy",
    "Director of Business Strategy",
  ],
  negative: [
    "Junior",
    "Associate Product Manager",
    "APM",
    "Intern",
    "Engineer",
    "Developer",
    "Software",
    "Data Scientist",
    "Analyst",
    "Product Operations",
    "Program Manager",
    "Project Manager",
  ],
};

export const trackedCompanies: TrackedCompany[] = [
  { name: "Okta", api: "https://boards-api.greenhouse.io/v1/boards/okta/jobs", enabled: true },
  { name: "CrowdStrike", api: "https://boards-api.greenhouse.io/v1/boards/crowdstrike/jobs", enabled: true },
  { name: "SentinelOne", api: "https://boards-api.greenhouse.io/v1/boards/sentinelone/jobs", enabled: true },
  { name: "Palo Alto Networks", api: "https://boards-api.greenhouse.io/v1/boards/paloaltonetworks/jobs", enabled: true },
  { name: "Zscaler", api: "https://boards-api.greenhouse.io/v1/boards/zscaler/jobs", enabled: true },
  { name: "Cloudflare", api: "https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs", enabled: true },
  { name: "Snyk", api: "https://boards-api.greenhouse.io/v1/boards/snyk/jobs", enabled: true },
  { name: "Salesforce", api: "https://boards-api.greenhouse.io/v1/boards/salesforce/jobs", enabled: true },
  { name: "HubSpot", api: "https://boards-api.greenhouse.io/v1/boards/hubspot/jobs", enabled: true },
  { name: "Slack", api: "https://boards-api.greenhouse.io/v1/boards/slack/jobs", enabled: true },
  { name: "Figma", api: "https://boards-api.greenhouse.io/v1/boards/figma/jobs", enabled: true },
  { name: "Stripe", api: "https://boards-api.greenhouse.io/v1/boards/stripe/jobs", enabled: true },
  { name: "Square", api: "https://boards-api.greenhouse.io/v1/boards/square/jobs", enabled: true },
  { name: "Shopify", api: "https://boards-api.greenhouse.io/v1/boards/shopify/jobs", enabled: true },
  { name: "Datadog", api: "https://boards-api.greenhouse.io/v1/boards/datadog/jobs", enabled: true },
  { name: "Twilio", api: "https://boards-api.greenhouse.io/v1/boards/twilio/jobs", enabled: true },
  { name: "Wise", api: "https://boards-api.greenhouse.io/v1/boards/wise/jobs", enabled: true },
  { name: "Guidepoint", api: "https://boards-api.greenhouse.io/v1/boards/guidepoint/jobs", enabled: true },
  { name: "Wealthsimple", api: "https://api.lever.co/v0/postings/wealthsimple?mode=json", enabled: true },
  { name: "Lightspeed Commerce", api: "https://boards-api.greenhouse.io/v1/boards/lightspeedcommerce/jobs", enabled: true },
  { name: "Koho Financial", api: "https://api.lever.co/v0/postings/koho?mode=json", enabled: true },
  { name: "Bloomberg (Canada)", api: "https://boards-api.greenhouse.io/v1/boards/bloomberg/jobs", enabled: true },
  { name: "Benevity", api: "https://boards-api.greenhouse.io/v1/boards/benevity/jobs", enabled: true },
  { name: "Airtable", api: "https://boards-api.greenhouse.io/v1/boards/airtable/jobs", enabled: true },
  { name: "Notion", api: "https://boards-api.greenhouse.io/v1/boards/notion/jobs", enabled: true },
  { name: "Anthropic", api: "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs", enabled: true },

  // Software for hardware / robotics / AV / industrial IoT (breadth: new verticals)
  { name: "Samsara", api: "https://boards-api.greenhouse.io/v1/boards/samsara/jobs", enabled: true },
  { name: "Cognite", api: "https://boards-api.greenhouse.io/v1/boards/cognite/jobs", enabled: true },
  { name: "Verkada", api: "https://boards-api.greenhouse.io/v1/boards/verkada/jobs", enabled: true },
  { name: "Nuro", api: "https://boards-api.greenhouse.io/v1/boards/nuro/jobs", enabled: true },
  { name: "Waymo", api: "https://boards-api.greenhouse.io/v1/boards/waymo/jobs", enabled: true },
  { name: "Waabi", api: "https://api.lever.co/v0/postings/waabi?mode=json", enabled: true },
  { name: "Anduril", api: "https://boards-api.greenhouse.io/v1/boards/andurilindustries/jobs", enabled: true },
  { name: "Flexport", api: "https://boards-api.greenhouse.io/v1/boards/flexport/jobs", enabled: true },

  // Developer tools / data / infrastructure
  { name: "Databricks", api: "https://boards-api.greenhouse.io/v1/boards/databricks/jobs", enabled: true },
  { name: "MongoDB", api: "https://boards-api.greenhouse.io/v1/boards/mongodb/jobs", enabled: true },
  { name: "GitLab", api: "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs", enabled: true },
  { name: "Vercel", api: "https://boards-api.greenhouse.io/v1/boards/vercel/jobs", enabled: true },
  { name: "Grafana Labs", api: "https://boards-api.greenhouse.io/v1/boards/grafanalabs/jobs", enabled: true },
  { name: "Amplitude", api: "https://boards-api.greenhouse.io/v1/boards/amplitude/jobs", enabled: true },

  // New-vertical SaaS (commerce / HR / marketplace / spend)
  { name: "Brex", api: "https://boards-api.greenhouse.io/v1/boards/brex/jobs", enabled: true },
  { name: "Gusto", api: "https://boards-api.greenhouse.io/v1/boards/gusto/jobs", enabled: true },
  { name: "Faire", api: "https://boards-api.greenhouse.io/v1/boards/faire/jobs", enabled: true },
  { name: "Webflow", api: "https://boards-api.greenhouse.io/v1/boards/webflow/jobs", enabled: true },
  { name: "Instacart", api: "https://boards-api.greenhouse.io/v1/boards/instacart/jobs", enabled: true },
];
