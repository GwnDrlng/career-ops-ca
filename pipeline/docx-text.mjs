// docx-text.mjs — shared plain-text extraction for .docx files.
// Used by judge.mjs and grounding-check.mjs, which both need to read
// generated CV/CL content without a docx-parsing dependency.

import { execSync } from "node:child_process";
import fs from "node:fs";

export function extractDocxText(docxPath) {
  if (!docxPath) return "";
  if (!fs.existsSync(docxPath)) throw new Error(`File not found: ${docxPath}`);
  const xml = execSync(`unzip -p "${docxPath}" word/document.xml`, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  // Insert paragraph breaks, then strip XML tags. Strip in a loop until stable
  // so a stray/overlapping tag can't reconstitute another (CodeQL
  // js/incomplete-multi-character-sanitization).
  let text = xml.replace(/<w:p[ >]/g, "\n$&");
  let prev;
  do {
    prev = text;
    text = text.replace(/<[^>]*>/g, "");
  } while (text !== prev);
  // Decode XML entities. &amp; MUST be decoded last: decoding it first would
  // double-unescape sequences like "&amp;lt;" into "<" (CodeQL js/double-escaping).
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
