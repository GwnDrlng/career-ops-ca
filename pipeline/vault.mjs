#!/usr/bin/env node
// vault.mjs — Keychain-backed store for pre-approved answers to sensitive
// form fields (work authorization, sponsorship, EEO/self-identification,
// salary expectation, disability, veteran status, referral). The applier
// fills these fields ONLY from vault entries you've explicitly set here —
// it never invents or infers an answer for them. Any sensitive field with
// no matching vault entry is flagged for your manual entry instead.
//
// Usage:
//   node vault.mjs set --key work_authorization --value "..."
//   node vault.mjs get --key work_authorization
//   node vault.mjs list
//   node vault.mjs unset --key work_authorization

import { execSync } from "node:child_process";

const SERVICE_PREFIX = "career-ops-vault";

// Known sensitive-field categories and the label patterns that identify them
// on a real form. Mirrors modes/apply.md Step 6's needs_candidate_confirmation
// categories exactly, so the applier and the interactive apply mode agree on
// what counts as sensitive.
export const VAULT_FIELDS = {
  work_authorization: [/legally authorized to work/i, /work authorization/i, /eligible to work/i],
  sponsorship: [/require.*sponsorship/i, /visa sponsorship/i, /now or in the future.*sponsorship/i],
  visa_status: [/visa status/i, /current visa/i],
  salary_expectation: [/salary expectation/i, /desired salary/i, /compensation expectation/i, /expected (base )?salary/i],
  relocation: [/willing to relocate/i, /relocation/i],
  disability_status: [/disability status/i, /do you have a disability/i, /voluntary self-identification.*disability/i],
  veteran_status: [/veteran status/i, /protected veteran/i],
  race_ethnicity: [/race\/ethnicity/i, /race or ethnicity/i],
  gender_identity: [/gender identity/i, /^gender$/i],
  referral_source: [/how did you hear about/i, /referred by/i],
  background_check: [/background check/i, /consent to a background/i],
};

function keychainService(key) {
  return `${SERVICE_PREFIX}-${key}`;
}

export function matchVaultKey(labelText) {
  for (const [key, patterns] of Object.entries(VAULT_FIELDS)) {
    if (patterns.some((p) => p.test(labelText))) return key;
  }
  return null;
}

export function getVaultEntry(key) {
  try {
    return execSync(`security find-generic-password -a "$USER" -s "${keychainService(key)}" -w 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

export function setVaultEntry(key, value) {
  if (!(key in VAULT_FIELDS)) {
    throw new Error(`Unknown vault key "${key}". Known keys: ${Object.keys(VAULT_FIELDS).join(", ")}`);
  }
  execSync(
    `security add-generic-password -a "$USER" -s "${keychainService(key)}" -w ${JSON.stringify(value)} -U`
  );
}

export function unsetVaultEntry(key) {
  try {
    execSync(`security delete-generic-password -a "$USER" -s "${keychainService(key)}"`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
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

// --- CLI (only runs when this file is executed directly, not when imported) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === "set") {
    const key = arg("key", true);
    const value = arg("value", true);
    setVaultEntry(key, value);
    console.log(`Stored vault entry "${key}".`);
  } else if (cmd === "get") {
    const key = arg("key", true);
    const value = getVaultEntry(key);
    console.log(value == null ? "(not set)" : value);
  } else if (cmd === "unset") {
    const key = arg("key", true);
    console.log(unsetVaultEntry(key) ? `Removed "${key}".` : `"${key}" was not set.`);
  } else if (cmd === "list") {
    for (const key of Object.keys(VAULT_FIELDS)) {
      const value = getVaultEntry(key);
      console.log(`${key}: ${value == null ? "(not set)" : "(set)"}`);
    }
  } else {
    console.error("Usage: node vault.mjs <set|get|unset|list> [--key K] [--value V]");
    console.error(`Known keys: ${Object.keys(VAULT_FIELDS).join(", ")}`);
    process.exit(1);
  }
}
