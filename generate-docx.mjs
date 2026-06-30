#!/usr/bin/env node
// generate-docx.mjs — ATS-optimized Word (.docx) CV generator
//
// Usage:
//   node generate-docx.mjs <content.json> <output.docx>
//
// Reads a structured CV content JSON (see schema below) and produces a clean,
// single-column, ATS-friendly Word document. Mirrors the section order and
// keyword strategy of the HTML/PDF flow (modes/pdf.md) but in .docx so the
// candidate (or a recruiter's ATS) can open and parse it in Word.
//
// Content JSON schema:
// {
//   "name": "Gwen Darling",
//   "headline": "Product Management Leader | ...",      // optional one-liner under name
//   "contact": "Location | email | linkedin",            // single contact line
//   "summary": ["paragraph 1", "paragraph 2"],           // Professional Summary paragraphs
//   "competencies": [ { "label": "Strategy", "items": "A | B | C" }, ... ],
//   "experience": [
//     {
//       "role": "Senior Product Manager, Incident Response",
//       "company": "Arctic Wolf Networks",
//       "dates": "Jan 2024 - May 2026",
//       "intro": "Optional intro paragraph.",
//       "groups": [ { "label": "Revenue & Margin", "bullets": ["...", "..."] } ]
//     }
//   ],
//   "education": ["line 1", "line 2"],
//   "certifications": ["cert 1", "cert 2"],
//   "recognition": [ { "label": "Patent (Pending)", "text": "..." } ]   // optional
// }

import fs from "node:fs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";

// --- ASCII normalization for ATS (mirror generate-pdf.mjs behavior) ---
function ascii(s) {
  if (s == null) return "";
  return String(s)
    .replace(/[‘’‚‛]/g, "'") // smart single quotes
    .replace(/[“”„‟]/g, '"') // smart double quotes
    .replace(/[–—]/g, "-") // en/em dash -> hyphen
    .replace(/…/g, "...") // ellipsis
    .replace(/[​-‍﻿]/g, ""); // zero-width chars
}

// Color + type scale (kept conservative for ATS parsers).
const ACCENT = "5A2DA8"; // purple-ish, used sparingly for company names
const CYAN = "147B86"; // section headers
const FONT = "Calibri"; // safe, universally installed Word font

function sectionHeader(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: CYAN },
    },
    children: [
      new TextRun({
        text: ascii(text).toUpperCase(),
        bold: true,
        size: 22, // half-points -> 11pt
        color: CYAN,
        font: FONT,
        characterSpacing: 10,
      }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: ascii(text), size: 20, font: FONT })],
  });
}

function buildDoc(cv) {
  const children = [];

  // --- Header: Name ---
  children.push(
    new Paragraph({
      spacing: { after: cv.headline ? 20 : 60 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT },
      },
      children: [
        new TextRun({
          text: ascii(cv.name),
          bold: true,
          size: 40, // 20pt
          font: FONT,
        }),
      ],
    })
  );

  if (cv.headline) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: ascii(cv.headline),
            size: 20,
            bold: true,
            color: ACCENT,
            font: FONT,
          }),
        ],
      })
    );
  }

  // --- Contact line ---
  if (cv.contact) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: ascii(cv.contact), size: 18, font: FONT }),
        ],
      })
    );
  }

  // --- Professional Summary ---
  if (cv.summary?.length) {
    children.push(sectionHeader("Professional Summary"));
    for (const para of cv.summary) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: ascii(para), size: 20, font: FONT })],
        })
      );
    }
  }

  // --- Core Competencies ---
  if (cv.competencies?.length) {
    children.push(sectionHeader("Core Competencies"));
    for (const c of cv.competencies) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: ascii(c.label) + ": ", bold: true, size: 20, font: FONT }),
            new TextRun({ text: ascii(c.items), size: 20, font: FONT }),
          ],
        })
      );
    }
  }

  // --- Work Experience ---
  if (cv.experience?.length) {
    children.push(sectionHeader("Work Experience"));
    for (const job of cv.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 0 },
          children: [
            new TextRun({ text: ascii(job.role), bold: true, size: 22, font: FONT }),
            new TextRun({ text: "  |  ", size: 22, font: FONT }),
            new TextRun({ text: ascii(job.company), bold: true, size: 22, color: ACCENT, font: FONT }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: ascii(job.dates), italics: true, size: 18, font: FONT }),
          ],
        })
      );
      if (job.intro) {
        children.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: ascii(job.intro), size: 20, font: FONT })],
          })
        );
      }
      for (const group of job.groups || []) {
        if (group.label) {
          children.push(
            new Paragraph({
              spacing: { before: 60, after: 20 },
              children: [
                new TextRun({ text: ascii(group.label), bold: true, italics: true, size: 19, font: FONT }),
              ],
            })
          );
        }
        for (const b of group.bullets || []) children.push(bullet(b));
      }
    }
  }

  // --- Education ---
  if (cv.education?.length) {
    children.push(sectionHeader("Education"));
    for (const e of cv.education) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: ascii(e), size: 20, font: FONT })],
        })
      );
    }
  }

  // --- Certifications ---
  if (cv.certifications?.length) {
    children.push(sectionHeader("Certifications"));
    for (const c of cv.certifications) children.push(bullet(c));
  }

  // --- Recognition ---
  if (cv.recognition?.length) {
    children.push(sectionHeader("Recognition & Speaking"));
    for (const r of cv.recognition) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: ascii(r.label) + ": ", bold: true, size: 20, font: FONT }),
            new TextRun({ text: ascii(r.text), size: 20, font: FONT }),
          ],
        })
      );
    }
  }

  return new Document({
    creator: ascii(cv.name),
    title: `${ascii(cv.name)} - CV`,
    styles: {
      default: {
        document: { run: { font: FONT, size: 20 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7),
            },
          },
        },
        children,
      },
    ],
  });
}

async function main() {
  const [, , contentPath, outPath] = process.argv;
  if (!contentPath || !outPath) {
    console.error("Usage: node generate-docx.mjs <content.json> <output.docx>");
    process.exit(1);
  }
  const cv = JSON.parse(fs.readFileSync(contentPath, "utf8"));
  const doc = buildDoc(cv);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
