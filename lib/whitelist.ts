// LARAPLAY — Whitelist emails depuis Google Sheet
// Sheet structure: Email | Nom | Actif | Date ajout | Role
// TTL cache 5 min pour limiter Sheets API.

import { getSheets } from "./google";

export interface WhitelistEntry {
  email: string;
  name: string;
  active: boolean;
  role: "admin" | "user";
  addedAt?: string;
}

let cache: { data: WhitelistEntry[]; ts: number } | null = null;
const TTL_MS = 5 * 60_000;

function sheetTab(): string {
  return process.env.GOOGLE_SHEET_TAB ?? "Autorisés";
}

function sheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID missing");
  return id;
}

async function fetchWhitelist(): Promise<WhitelistEntry[]> {
  const sheets = getSheets();
  const range = `${sheetTab()}!A2:E`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range,
  });

  const rows = res.data.values ?? [];
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      email: String(r[0]).trim().toLowerCase(),
      name: String(r[1] ?? "").trim(),
      active: String(r[2] ?? "").toUpperCase() === "TRUE",
      addedAt: r[3] ? String(r[3]) : undefined,
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

function invalidateCache() {
  cache = null;
}

/**
 * Ajoute une entrée à la whitelist Sheet.
 * Si email existe déjà → met à jour. Sinon append.
 */
export async function addOrUpdateUser(input: {
  email: string;
  name?: string;
  role?: "admin" | "user";
  active?: boolean;
}): Promise<WhitelistEntry> {
  const sheets = getSheets();
  const id = sheetId();
  const tab = sheetTab();

  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Email invalide");
  }

  const today = new Date().toISOString().slice(0, 10);
  const row = [
    cleanEmail,
    input.name?.trim() ?? "",
    input.active === false ? "FALSE" : "TRUE",
    today,
    input.role ?? "user",
  ];

  // Cherche ligne existante pour update
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!A2:A`,
  });
  const rows = existing.data.values ?? [];
  const rowIndex = rows.findIndex(
    (r) => String(r[0] ?? "").trim().toLowerCase() === cleanEmail
  );

  if (rowIndex >= 0) {
    // Update row (rowIndex 0-based dans A2:A → ligne réelle = rowIndex + 2)
    const realRow = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${tab}!A${realRow}:E${realRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  } else {
    // Append nouvelle ligne
    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: `${tab}!A:E`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  }

  invalidateCache();

  return {
    email: cleanEmail,
    name: input.name?.trim() ?? "",
    active: input.active !== false,
    addedAt: today,
    role: input.role ?? "user",
  };
}

/**
 * Supprime une entrée par email (clear ligne, pas de delete physique pour préserver formules).
 * Set active=FALSE. Pour suppression physique, modifier sheet manuellement.
 */
export async function deactivateUser(email: string): Promise<boolean> {
  const sheets = getSheets();
  const id = sheetId();
  const tab = sheetTab();
  const cleanEmail = email.trim().toLowerCase();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!A2:A`,
  });
  const rows = existing.data.values ?? [];
  const rowIndex = rows.findIndex(
    (r) => String(r[0] ?? "").trim().toLowerCase() === cleanEmail
  );
  if (rowIndex < 0) return false;

  const realRow = rowIndex + 2;
  // Set colonne C (Actif) = FALSE
  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${tab}!C${realRow}`,
    valueInputOption: "RAW",
    requestBody: { values: [["FALSE"]] },
  });

  invalidateCache();
  return true;
}

/**
 * Supprime physiquement la ligne (clear cells email pour qu'elle disparaisse au filter).
 */
export async function removeUser(email: string): Promise<boolean> {
  const sheets = getSheets();
  const id = sheetId();
  const tab = sheetTab();
  const cleanEmail = email.trim().toLowerCase();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!A2:A`,
  });
  const rows = existing.data.values ?? [];
  const rowIndex = rows.findIndex(
    (r) => String(r[0] ?? "").trim().toLowerCase() === cleanEmail
  );
  if (rowIndex < 0) return false;

  const realRow = rowIndex + 2;
  // Clear toute la ligne A:E (l'email vide → filter exclu)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: id,
    range: `${tab}!A${realRow}:E${realRow}`,
  });

  invalidateCache();
  return true;
}
