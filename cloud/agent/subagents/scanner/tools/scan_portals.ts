import { defineTool } from "eve/tools";
import { z } from "zod";
import { hasSeenPosting, markSeenPosting } from "../../../lib/dedup.js";
import { titleFilter, trackedCompanies } from "../../../lib/portals-config.js";

function detectAts(apiUrl: string): "greenhouse" | "ashby" | "lever" | null {
  if (apiUrl.includes("greenhouse.io")) return "greenhouse";
  if (apiUrl.includes("ashbyhq.com")) return "ashby";
  if (apiUrl.includes("api.lever.co")) return "lever";
  return null;
}

interface RawPosting {
  title: string;
  url: string;
  description?: string;
}

async function fetchGreenhouse(apiUrl: string): Promise<RawPosting[]> {
  const res = await fetch(`${apiUrl}?content=true`);
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: Array<{ title: string; absolute_url: string; content?: string }> };
  return (data.jobs || []).map((j) => ({ title: j.title, url: j.absolute_url, description: j.content }));
}

async function fetchAshby(apiUrl: string): Promise<RawPosting[]> {
  const res = await fetch(apiUrl);
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: Array<{ title: string; jobUrl: string; descriptionPlain?: string }> };
  return (data.jobs || []).map((j) => ({ title: j.title, url: j.jobUrl, description: j.descriptionPlain }));
}

async function fetchLever(apiUrl: string): Promise<RawPosting[]> {
  const res = await fetch(apiUrl);
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ text: string; hostedUrl: string; descriptionPlain?: string }>;
  return (data || []).map((j) => ({ title: j.text, url: j.hostedUrl, description: j.descriptionPlain }));
}

function titleMatches(title: string): boolean {
  const t = title.toLowerCase();
  if (titleFilter.negative.some((n) => t.includes(n.toLowerCase()))) return false;
  if (titleFilter.positive.length === 0) return true;
  return titleFilter.positive.some((p) => t.includes(p.toLowerCase()));
}

export default defineTool({
  description: "Scan configured job portals (Greenhouse/Ashby/Lever direct APIs) and return newly-seen postings matching the title filter. Already-reported postings are excluded.",
  inputSchema: z.object({}),
  async execute() {
    const companies = trackedCompanies.filter((c) => c.enabled);

    const newPostings: Array<{ company: string; title: string; url: string; description: string }> = [];

    for (const company of companies) {
      const ats = detectAts(company.api);
      if (!ats) continue;

      let postings: RawPosting[] = [];
      try {
        if (ats === "greenhouse") postings = await fetchGreenhouse(company.api);
        else if (ats === "ashby") postings = await fetchAshby(company.api);
        else if (ats === "lever") postings = await fetchLever(company.api);
      } catch {
        continue; // one company's API failing shouldn't fail the whole scan
      }

      for (const posting of postings) {
        if (!titleMatches(posting.title)) continue;
        if (await hasSeenPosting(posting.url)) continue;
        await markSeenPosting(posting.url);
        newPostings.push({
          company: company.name,
          title: posting.title,
          url: posting.url,
          description: posting.description || "",
        });
      }
    }

    return { newPostings, companiesScanned: companies.length };
  },
});
