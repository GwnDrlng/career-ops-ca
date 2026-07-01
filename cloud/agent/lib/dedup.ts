// lib/dedup.ts — cross-run scan-history dedup.
//
// TODO(storage decision pending): this needs to persist across separate
// daily schedule invocations, which do NOT share eve session state or
// sandbox filesystem (both are per-session; see eve's State docs). It needs
// an external store. Candidates: Vercel KV / Upstash Redis (simplest fit for
// a "have we seen this URL" set), or Vercel Postgres if the cloud side ever
// needs to track more than just dedup.
//
// Until that's decided, this falls back to in-memory storage, which means
// dedup ONLY works within a single warm serverless instance and resets on
// cold start / redeploy. Every posting will look "new" again after a cold
// start. This is a known, intentional gap — do not rely on it for anything
// beyond local `eve dev` testing.

const seen = new Set<string>();

export async function hasSeenPosting(url: string): Promise<boolean> {
  return seen.has(url);
}

export async function markSeenPosting(url: string): Promise<void> {
  seen.add(url);
}
