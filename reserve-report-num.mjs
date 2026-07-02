#!/usr/bin/env node
// reserve-report-num.mjs — atomically claim the next sequential report number.
//
// verify-pipeline.mjs already expects this contract (see its Check 8): this
// script drops a `reports/{NNN}-RESERVED.md` sentinel file when a number is
// claimed, so concurrent callers (the watcher daemon + an interactive Claude
// Code session) can't collide on the same number. The caller MUST delete the
// sentinel (via `--release`) after writing the real report file. Sentinels
// older than 4h are garbage-collected by verify-pipeline.mjs if a process
// crashes before releasing.
//
// Usage:
//   node reserve-report-num.mjs                 # reserve next number, print JSON
//   node reserve-report-num.mjs --release 042    # release a claimed number

import fs from "node:fs";
import path from "node:path";

const REPORTS_DIR = "reports";

function existingNumbers() {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  return fs
    .readdirSync(REPORTS_DIR)
    .map((name) => name.match(/^(\d{3})-/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
}

function reserve() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  let candidate = Math.max(0, ...existingNumbers()) + 1;
  for (let attempts = 0; attempts < 1000; attempts++) {
    const num = String(candidate).padStart(3, "0");
    const sentinel = path.join(REPORTS_DIR, `${num}-RESERVED.md`);
    try {
      const fd = fs.openSync(sentinel, "wx"); // exclusive create — fails if it already exists
      fs.writeSync(fd, `Reserved ${new Date().toISOString()} by reserve-report-num.mjs (pid ${process.pid})\n`);
      fs.closeSync(fd);
      return { number: num, sentinel };
    } catch (err) {
      if (err.code === "EEXIST") {
        candidate++; // lost the race (or a real report already claimed it) — try the next slot
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not reserve a report number after 1000 attempts.");
}

function release(num) {
  const padded = String(num).padStart(3, "0");
  const sentinel = path.join(REPORTS_DIR, `${padded}-RESERVED.md`);
  if (fs.existsSync(sentinel)) fs.unlinkSync(sentinel);
  return { released: padded };
}

const releaseArgIdx = process.argv.indexOf("--release");
if (releaseArgIdx !== -1) {
  const num = process.argv[releaseArgIdx + 1];
  if (!num) {
    console.error("Usage: node reserve-report-num.mjs --release <NNN>");
    process.exit(1);
  }
  console.log(JSON.stringify(release(num)));
} else {
  console.log(JSON.stringify(reserve()));
}
