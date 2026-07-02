import { defineTool } from "eve/tools";
import { z } from "zod";
import { hasSeenPosting, markSeenPosting, flushSeenPostings } from "../../../lib/dedup.js";
import { titleFilter, trackedCompanies } from "../../../lib/portals-config.js";

function detectAts(apiUrl: string): "greenhouse" | "ashby" | "lever" | "workday" | null {
  if (apiUrl.includes("greenhouse.io")) return "greenhouse";
  if (apiUrl.includes("ashbyhq.com")) return "ashby";
  if (apiUrl.includes("api.lever.co")) return "lever";
  if (apiUrl.includes("myworkdayjobs.com")) return "workday";
  return null;
}

interface RawPosting {
  title: string;
  url: string;
  description?: string;
}

// Per-portal request timeout. The whole scan runs inside ONE durable workflow
// step, bounded by the Vercel function max duration (300s). A single slow or
// hung portal must not consume that budget, so every fetch is capped and the
// portals are scanned in parallel (see execute()). AbortSignal.timeout aborts
// the request when it fires; the caller treats an abort like any other failure.
const FETCH_TIMEOUT_MS = 15_000;

function timedFetch(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

function timedPost(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

async function fetchGreenhouse(apiUrl: string): Promise<RawPosting[]> {
  const res = await timedFetch(`${apiUrl}?content=true`);
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: Array<{ title: string; absolute_url: string; content?: string }> };
  return (data.jobs || []).map((j) => ({ title: j.title, url: j.absolute_url, description: j.content }));
}

async function fetchAshby(apiUrl: string): Promise<RawPosting[]> {
  const res = await timedFetch(apiUrl);
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs?: Array<{ title: string; jobUrl: string; descriptionPlain?: string }> };
  return (data.jobs || []).map((j) => ({ title: j.title, url: j.jobUrl, description: j.descriptionPlain }));
}

async function fetchLever(apiUrl: string): Promise<RawPosting[]> {
  const res = await timedFetch(apiUrl);
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ text: string; hostedUrl: string; descriptionPlain?: string }>;
  return (data || []).map((j) => ({ title: j.text, url: j.hostedUrl, description: j.descriptionPlain }));
}

// Workday exposes a public CXS jobs endpoint (POST, paginated). `apiUrl` is the
// full CXS URL, e.g. https://<tenant>.<inst>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs.
// Job links are relative to the site (origin + /<site> + externalPath), so we
// derive the site segment (the one right before "/jobs") from the same URL.
const WORKDAY_PAGE_SIZE = 20;
const WORKDAY_MAX_PAGES = 25; // ≤ 500 postings/site — bounds the per-portal step

async function fetchWorkday(apiUrl: string): Promise<RawPosting[]> {
  const m = apiUrl.match(/^(https:\/\/[^/]+)\/wday\/cxs\/[^/]+\/([^/]+)\/jobs/);
  if (!m) return [];
  const [, origin, site] = m;
  const jobBase = `${origin}/${site}`;
  const postings: RawPosting[] = [];
  for (let page = 0; page < WORKDAY_MAX_PAGES; page++) {
    const res = await timedPost(apiUrl, {
      limit: WORKDAY_PAGE_SIZE,
      offset: page * WORKDAY_PAGE_SIZE,
      searchText: "",
      appliedFacets: {},
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      jobPostings?: Array<{ title: string; externalPath: string }>;
    };
    const batch = data.jobPostings || [];
    for (const j of batch) {
      if (!j.externalPath) continue;
      postings.push({ title: j.title, url: jobBase + j.externalPath });
    }
    if (batch.length < WORKDAY_PAGE_SIZE) break;
  }
  return postings;
}

function titleMatches(title: string): boolean {
  const t = title.toLowerCase();
  if (titleFilter.negative.some((n) => t.includes(n.toLowerCase()))) return false;
  if (titleFilter.positive.length === 0) return true;
  return titleFilter.positive.some((p) => t.includes(p.toLowerCase()));
}

export default defineTool({
  description: "Scan configured job portals (Greenhouse/Ashby/Lever/Workday direct APIs) and return newly-seen postings matching the title filter. Already-reported postings are excluded.",
  inputSchema: z.object({}),
  async execute() {
    const companies = trackedCompanies.filter((c) => c.enabled);

    // Scan every portal in parallel. Sequentially awaiting ~45 portals summed
    // their latencies into one step and a single hung endpoint could exhaust
    // the whole 300s function budget (→ 504 → the workflow retries forever and
    // nothing ever posts). Parallel + per-request timeout bounds this step to
    // the slowest single portal (≤ FETCH_TIMEOUT_MS), not the sum.
    const scanned = await Promise.allSettled(
      companies.map(async (company) => {
        const ats = detectAts(company.api);
        if (!ats) return { company, postings: [] as RawPosting[] };
        let postings: RawPosting[] = [];
        if (ats === "greenhouse") postings = await fetchGreenhouse(company.api);
        else if (ats === "ashby") postings = await fetchAshby(company.api);
        else if (ats === "lever") postings = await fetchLever(company.api);
        else if (ats === "workday") postings = await fetchWorkday(company.api);
        return { company, postings };
      }),
    );

    const newPostings: Array<{ company: string; title: string; url: string; description: string }> = [];

    // The dedup checks below operate on an in-memory cache (loaded once), so
    // this loop is fast and CPU-bound — no network in here.
    for (const result of scanned) {
      if (result.status !== "fulfilled") continue; // a failed/timed-out portal is skipped, not fatal
      const { company, postings } = result.value;
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

    // Persist the dedup set once, after all companies are scanned.
    await flushSeenPostings();

    return { newPostings, companiesScanned: companies.length };
  },
});
