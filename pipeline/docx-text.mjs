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
  return xml
    .replace(/<w:p[ >]/g, "\n$&")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
