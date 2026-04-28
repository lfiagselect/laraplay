// LARAPLAY — Whitelist emails depuis Google Sheet
// Sheet structure: Email | Nom | Actif | Date ajout | Role
// TTL cache 60s pour éviter spam Sheets API.

import { getSheets } from "./google";

export interface WhitelistEntry {
  email: string;
  name: string;
  active: boolean;
  role: "admin" | "user";
}

let cache: { data: WhitelistEntry[]; ts: number } | null = null;
const TTL_MS = 5 * 60_000; // 5 min — modif Sheet visible 5 min plus tard max

async function fetchWhitelist(): Promise<WhitelistEntry[]> {
  const sheets = getSheets();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB ?? "Autorisés";

  if (!sheetId) throw new Error("GOOGLE_SHEET_ID missing");

  const range = `${tab}!A2:E`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  const rows = res.data.values ?? [];
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      email: String(r[0]).trim().toLowerCase(),
      name: String(r[1] ?? "").trim(),
      active: String(r[2] ?? "").toUpperCase() === "TRUE",
      role: (String(r[4] ?? "user").trim().toLowerCase() as "admin" | "user") || "user",
    }));
}

export async function getWhitelist(force = false): Promise<WhitelistEntry[]> {
  const now = Date.now();
  if (!force && cache && now - cache.ts < TTL_MS) return cache.data;
  const data = await fetchWhitelist();
  cache = { data, ts: now };
  return data;
}

export async function isAuthorized(email: string): Promise<WhitelistEntry | null> {
  const wl = await getWhitelist();
  const found = wl.find((e) => e.email === email.trim().toLowerCase());
  if (!found) return null;
  if (!found.active) return null;
  return found;
}
