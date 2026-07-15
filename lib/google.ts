// LARAPLAY — Google API client (Sheets uniquement — VIDEO-01: Drive retiré du runtime)
// Service account auth. Lazy-init pour pas planter au build.

import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";

/**
 * Auth Google. Deux modes:
 * - Local dev: GOOGLE_APPLICATION_CREDENTIALS = chemin fichier JSON
 * - Vercel prod: GOOGLE_SERVICE_ACCOUNT_JSON = string JSON complet
 */
function getAuth() {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // Scope spreadsheets read+write requis pour panneau admin (ajout/suppression users).
  // Le service account doit être partagé en éditeur sur le Sheet whitelist.
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

  if (inlineJson) {
    const credentials = JSON.parse(inlineJson);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }

  if (keyFile) {
    return new google.auth.GoogleAuth({ keyFile, scopes });
  }

  throw new Error(
    "Google credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS (local) or GOOGLE_SERVICE_ACCOUNT_JSON (prod)."
  );
}

export function getSheets(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}
