#!/usr/bin/env node
// identity.mjs — deterministic identity fields the applier types into forms
// (full name, preferred name, phone, location). These are NON-sensitive
// identity basics read from the `form_autofill` block of config/profile.yml,
// which is gitignored (user layer, never committed). Keeping them here means
// the applier fills them exactly as configured and NEVER sends them to an Opus
// draft call — no PII leaks into an LLM prompt, and the values can't be
// hallucinated.
//
// This complements pipeline/vault.mjs: the Keychain vault holds legally
// sensitive answers (work auth, EEO, background check, onsite commitment,
// interview travel, referral source); identity.mjs holds plain identity basics.
// The applier resolves a field in the order: vault -> identity -> Opus draft.
//
// Usage:
//   node identity.mjs list
//   node identity.mjs get --key phone

import fs from "node:fs";
import yaml from "js-yaml";

const PROFILE_PATH = "config/profile.yml";

// Identity categories and the label/legend patterns that identify them on a
// real form. First/last name are split off "full name" so ATS forms that ask
// for them separately still resolve. `full_name` is intentionally last in the
// resolution loop so a plain "Name" field falls through to it.
export const IDENTITY_FIELDS = {
  preferred_name: [/preferred name/i, /preferred first name/i, /nick ?name/i, /goes by/i, /what should we call you/i],
  first_name: [/first name/i, /given name/i, /^forename$/i],
  last_name: [/last name/i, /family name/i, /surname/i],
  phone: [/phone/i, /mobile/i, /telephone/i, /contact number/i, /cell/i],
  location: [/^location$/i, /current location/i, /city.*(state|province|country)/i, /where are you (located|based)/i, /^city$/i, /your city/i],
  full_name: [/full name/i, /legal name/i, /^name$/i, /your name/i, /candidate name/i],
};

function loadFormAutofill() {
  if (!fs.existsSync(PROFILE_PATH)) return {};
  try {
    const profile = yaml.load(fs.readFileSync(PROFILE_PATH, "utf8")) || {};
    return profile.form_autofill || {};
  } catch {
    return {};
  }
}

// Match a form field's label (or group legend) to an identity key. Returns the
// key or null. Tests each candidate label independently (so anchored patterns
// like /^name$/i aren't broken by joining) and preserves IDENTITY_FIELDS order,
// so a plain "Name" resolves to full_name only after the more specific
// preferred/first/last patterns have had a chance to match.
export function matchIdentityField(...labels) {
  const candidates = labels.filter(Boolean);
  for (const [key, patterns] of Object.entries(IDENTITY_FIELDS)) {
    if (candidates.some((l) => patterns.some((p) => p.test(l)))) return key;
  }
  return null;
}

// Resolve an identity key to its value from config/profile.yml form_autofill.
// first_name/last_name are derived from full_name when not set explicitly.
export function getIdentityValue(key, autofill = loadFormAutofill()) {
  if (key in autofill && autofill[key] != null && String(autofill[key]).trim() !== "") {
    return String(autofill[key]);
  }
  const full = autofill.full_name ? String(autofill.full_name).trim() : "";
  if (key === "first_name" && full) return full.split(/\s+/)[0];
  if (key === "last_name" && full) {
    const parts = full.split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }
  return null;
}

function arg(name, required = false) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? process.argv[i + 1] : undefined;
  if (required && !v) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return v;
}

// --- CLI (only runs when executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  const autofill = loadFormAutofill();
  if (cmd === "get") {
    const key = arg("key", true);
    const value = getIdentityValue(key, autofill);
    console.log(value == null ? "(not set)" : value);
  } else if (cmd === "list") {
    for (const key of Object.keys(IDENTITY_FIELDS)) {
      const value = getIdentityValue(key, autofill);
      console.log(`${key}: ${value == null ? "(not set)" : value}`);
    }
  } else {
    console.error("Usage: node identity.mjs <get|list> [--key K]");
    console.error(`Known keys: ${Object.keys(IDENTITY_FIELDS).join(", ")}`);
    process.exit(1);
  }
}
