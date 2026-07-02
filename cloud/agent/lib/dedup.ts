// lib/dedup.ts — cross-run scan dedup, persisted in Vercel Blob.
//
// The seen-set now survives cold starts / redeploys (in-memory alone reset on
// every deploy, forcing a costly full re-grade each time). Cloud-only: the
// on-prem scanner keeps its own data/scan-history.tsv, unrelated to this.
//
// Storage model: the entire seen-set is one JSON array at a fixed Blob key
// (dedup/seen.json). It's loaded once per invocation into an in-memory cache;
// hasSeenPosting/markSeenPosting operate on the cache; flushSeenPostings()
// writes the cache back to Blob ONCE at the end of a scan (not per URL).
//
// This is a whole-object read-modify-write. It's adequate here because scans are
// infrequent (one daily cron + occasional /scan) and the cloud dedup is a COST
// optimization, not a correctness guarantee — the on-prem applications.md
// duplicate guard is the real backstop, so a rare lost update just re-grades a
// posting once. It is NOT suitable for high write concurrency; if that ever
// changes, move to a Redis set (atomic SADD/SISMEMBER).
//
// Uses BLOB_READ_WRITE_TOKEN (auto-injected once the Blob store is linked to the
// project). All Blob access is fail-open: if the token/store is unavailable, the
// scan still runs (treating everything as unseen) rather than crashing.

import { put, get } from "@vercel/blob";

const KEY = "dedup/seen.json";
// The Blob store is private, so reads/writes go through the SDK (which supplies
// the BLOB_READ_WRITE_TOKEN / OIDC auth) — a plain fetch of the URL is rejected.
const ACCESS = "private" as const;

let cache: Set<string> | null = null;
let dirty = false;

async function load(): Promise<Set<string>> {
  if (cache) return cache;
  try {
    const result = await get(KEY, { access: ACCESS });
    if (result && result.statusCode === 200) {
      const arr: unknown = await new Response(result.stream).json();
      cache = new Set(Array.isArray(arr) ? (arr as string[]) : []);
      return cache;
    }
  } catch (err) {
    console.error("[dedup] Blob read failed — treating as empty for this run:", err);
  }
  cache = new Set();
  return cache;
}

export async function hasSeenPosting(url: string): Promise<boolean> {
  return (await load()).has(url);
}

export async function markSeenPosting(url: string): Promise<void> {
  const seen = await load();
  if (!seen.has(url)) {
    seen.add(url);
    dirty = true;
  }
}

// Persist the seen-set to Blob once, at the end of a scan. No-op when nothing
// changed, so a scan that finds no new postings does not rewrite the blob.
// Fail-open: a write error is logged but never breaks the scan (worst case the
// affected postings get re-graded on the next run).
export async function flushSeenPostings(): Promise<void> {
  if (!dirty || !cache) return;
  try {
    await put(KEY, JSON.stringify([...cache]), {
      access: ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    dirty = false;
  } catch (err) {
    console.error("[dedup] Blob write failed — dedup not persisted this run:", err);
  }
}
