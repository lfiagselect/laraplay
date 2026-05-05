// LARAPLAY — Google API client (Drive + Sheets)
// Service account auth. Lazy-init pour pas planter au build.

import { google } from "googleapis";
import type { drive_v3, sheets_v4 } from "googleapis";

/**
 * Auth Google. Deux modes:
 * - Local dev: GOOGLE_APPLICATION_CREDENTIALS = chemin fichier JSON
 * - Netlify/Vercel prod: GOOGLE_SERVICE_ACCOUNT_JSON = JSON ou Base64
 */
function getAuth() {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const scopes = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
  ];

  if (inlineJson) {
    // Supporte JSON brut ou Base64
    let jsonString = inlineJson;
    if (!inlineJson.trim().startsWith("{")) {
      jsonString = Buffer.from(inlineJson, "base64").toString("utf-8");
    }
    const credentials = JSON.parse(jsonString);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }

  if (keyFile) {
    return new google.auth.GoogleAuth({ keyFile, scopes });
  }

  throw new Error(
    "Google credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS (local) or GOOGLE_SERVICE_ACCOUNT_JSON (prod)."
  );
}

export function getDrive(): drive_v3.Drive {
  return google.drive({ version: "v3", auth: getAuth() });
}

export function getSheets(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}
