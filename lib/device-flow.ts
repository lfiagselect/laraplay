// LARAPLAY — Device Flow OAuth 2.0 (RFC 8628 inspired).
// V3: statut "consumed" (usage unique), TTL vérifié sur tous les statuts,
// consommation compare-and-set, purge des lignes terminales, log haché.
// Store: Google Sheet (onglet "DeviceFlow").
//
// Sheet schema (onglet GOOGLE_SHEET_DEVICEFLOW_TAB, défaut "DeviceFlow"):
//   A: device_code (hex 64)
//   B: user_code (XXXX-XXXX)
//   C: email (vide tant que pending/expired/denied)
//   D: status (pending|approved|consumed|expired|denied)
//   E: createdAt (ISO 8601)
//   F: expiresAt (ISO 8601)
//   G: lastPollAt (ISO 8601, throttle)
//   H: consumedAt (ISO 8601)
//
// Machine d'état:
//   pending -> approved -> consumed
//   pending -> denied | expired
//   approved -> expired
//   Toujours refusé si now >= expiresAt.

import crypto from "crypto";
import { getSheets } from "./google";

export interface DeviceSession {
  deviceCode: string;
  userCode: string;
  email: string | null;
  status: "pending" | "approved" | "consumed" | "expired" | "denied";
  createdAt: number;
  expiresAt: number;
  lastPollAt: number;
  consumedAt: number;
}

const EXPIRES_MS = 10 * 60_000; // 10 min
const MIN_POLL_INTERVAL_MS = 4_000;
const PURGE_AFTER_MS = 24 * 60 * 60_000; // lignes terminales > 24h supprimées

// Charset user-friendly (sans 0/O/1/I confusion)
const USER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USER_CODE_LEN = 8;

const TERMINAL_STATUSES = new Set(["consumed", "expired", "denied"]);

function deviceTab(): string {
  return process.env.GOOGLE_SHEET_DEVICEFLOW_TAB ?? "DeviceFlow";
}

function sheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID missing");
  return id;
}

/** Identifiant loggable: jamais le device_code complet. */
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);
}

function genUserCode(): string {
  const buf = crypto.randomBytes(USER_CODE_LEN);
  let out = "";
  for (let i = 0; i < USER_CODE_LEN; i++) {
    out += USER_CODE_CHARS[buf[i] % USER_CODE_CHARS.length];
  }
  return out.slice(0, 4) + "-" + out.slice(4);
}

function genDeviceCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

function normalizeUserCode(userCode: string): string {
  const normalized = userCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const compact = normalized.replace(/-/g, "");
  return compact.length === USER_CODE_LEN
    ? compact.slice(0, 4) + "-" + compact.slice(4)
    : normalized;
}

function rowToSession(row: string[]): DeviceSession | null {
  if (!row[0] || !row[1]) return null;
  try {
    return {
      deviceCode: String(row[0]),
      userCode: String(row[1]),
      email: row[2] ? String(row[2]) : null,
      status: (String(row[3] ?? "pending") as DeviceSession["status"]),
      createdAt: row[4] ? new Date(String(row[4])).getTime() : 0,
      expiresAt: row[5] ? new Date(String(row[5])).getTime() : 0,
      lastPollAt: row[6] ? new Date(String(row[6])).getTime() : 0,
      consumedAt: row[7] ? new Date(String(row[7])).getTime() : 0,
    };
  } catch {
    return null;
  }
}

function sessionToRow(s: DeviceSession): string[] {
  return [
    s.deviceCode,
    s.userCode,
    s.email ?? "",
    s.status,
    new Date(s.createdAt).toISOString(),
    new Date(s.expiresAt).toISOString(),
    s.lastPollAt > 0 ? new Date(s.lastPollAt).toISOString() : "",
    s.consumedAt > 0 ? new Date(s.consumedAt).toISOString() : "",
  ];
}

/** TTL: applique l'expiration quel que soit le statut non terminal. */
function applyTTL(s: DeviceSession): DeviceSession {
  if (Date.now() >= s.expiresAt && !TERMINAL_STATUSES.has(s.status)) {
    s.status = "expired";
  }
  return s;
}

/** Trouve ligne réelle Sheet (1-indexed) pour un device_code donné. -1 si absent. */
async function findRowByDeviceCode(deviceCode: string): Promise<number> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A2:A`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => String(r[0] ?? "") === deviceCode);
  return idx >= 0 ? idx + 2 : -1;
}

/** Trouve ligne réelle Sheet (1-indexed) pour un user_code donné. -1 si absent. */
async function findRowByUserCode(userCode: string): Promise<number> {
  const wanted = normalizeUserCode(userCode);
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A2:B`,
  });
  const rows = res.data.values ?? [];
  const idx = rows.findIndex((r) => normalizeUserCode(String(r[1] ?? "")) === wanted);
  return idx >= 0 ? idx + 2 : -1;
}

/** Numeric sheetId (gid) de l'onglet DeviceFlow, pour deleteDimension. */
async function deviceSheetGid(): Promise<number | null> {
  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId() });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === deviceTab());
  return sheet?.properties?.sheetId ?? null;
}

/**
 * Purge best-effort: supprime les lignes terminales (ou expirées de fait)
 * plus vieilles que PURGE_AFTER_MS. Ne bloque jamais l'appelant.
 */
export async function purgeStaleSessions(): Promise<void> {
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId(),
      range: `${deviceTab()}!A2:H`,
    });
    const rows = res.data.values ?? [];
    const now = Date.now();
    const toDelete: number[] = [];
    rows.forEach((r, i) => {
      const s = rowToSession(r.map(String));
      if (!s) {
        toDelete.push(i + 2);
        return;
      }
      const stale = now - s.expiresAt > PURGE_AFTER_MS;
      if (stale && (TERMINAL_STATUSES.has(s.status) || now >= s.expiresAt)) {
        toDelete.push(i + 2);
      }
    });
    if (toDelete.length === 0) return;
    const gid = await deviceSheetGid();
    if (gid === null) return;
    // Supprimer de bas en haut pour ne pas décaler les index.
    const requests = toDelete
      .sort((a, b) => b - a)
      .map((rowNum) => ({
        deleteDimension: {
          range: {
            sheetId: gid,
            dimension: "ROWS" as const,
            startIndex: rowNum - 1,
            endIndex: rowNum,
          },
        },
      }));
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId(),
      requestBody: { requests },
    });
  } catch (err) {
    console.warn("[device-flow] purge failed:", err instanceof Error ? err.message : String(err));
  }
}

export async function createDeviceSession(): Promise<DeviceSession> {
  const userCode = genUserCode();
  const deviceCode = genDeviceCode();
  const now = Date.now();
  const session: DeviceSession = {
    deviceCode,
    userCode,
    email: null,
    status: "pending",
    createdAt: now,
    expiresAt: now + EXPIRES_MS,
    lastPollAt: 0,
    consumedAt: 0,
  };

  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A:H`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [sessionToRow(session)] },
  });

  // Purge opportuniste, non bloquante.
  void purgeStaleSessions();

  return session;
}

export async function getByDeviceCode(deviceCode: string): Promise<DeviceSession | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A2:H`,
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => String(r[0] ?? "") === deviceCode);
  if (!row) return null;
  const s = rowToSession(row);
  if (!s) return null;
  return applyTTL(s);
}

export async function getByUserCode(userCode: string): Promise<DeviceSession | null> {
  const wanted = normalizeUserCode(userCode);

  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A2:H`,
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => normalizeUserCode(String(r[1] ?? "")) === wanted);
  if (!row) return null;
  const s = rowToSession(row);
  if (!s) return null;
  return applyTTL(s);
}

/**
 * Consommation usage-unique (compare-and-set best-effort sur Sheets):
 * 1. lit la ligne, refuse si non approved / expiré / déjà consommé,
 * 2. écrit un jeton de consommation unique, relit, vérifie que c'est le nôtre,
 * 3. marque consumed + consumedAt.
 * Deux finalisations concurrentes: une seule gagne le jeton.
 * Retourne la session consommée (avec email), ou null si invalid_grant.
 */
export async function consumeDevice(deviceCode: string): Promise<DeviceSession | null> {
  const row = await findRowByDeviceCode(deviceCode);
  if (row < 0) return null;

  const sheets = getSheets();
  const read = async (): Promise<DeviceSession | null> => {
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId(),
      range: `${deviceTab()}!A${row}:H${row}`,
    });
    const values = r.data.values?.[0];
    return values ? rowToSession(values.map(String)) : null;
  };

  const s = await read();
  if (!s || s.deviceCode !== deviceCode) return null;
  applyTTL(s);
  if (s.status !== "approved" || !s.email) return null;
  if (Date.now() >= s.expiresAt) return null;

  // Jeton de claim unique écrit dans D, relu pour arbitrer la concurrence.
  const claim = `consumed:${hashCode(deviceCode)}:${crypto.randomBytes(8).toString("hex")}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!D${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [[claim]] },
  });

  const check = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!D${row}`,
  });
  const current = String(check.data.values?.[0]?.[0] ?? "");
  if (current !== claim) return null; // un concurrent a gagné

  const consumedAt = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!D${row}:H${row}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        "consumed",
        new Date(s.createdAt).toISOString(),
        new Date(s.expiresAt).toISOString(),
        s.lastPollAt > 0 ? new Date(s.lastPollAt).toISOString() : "",
        consumedAt,
      ]],
    },
  });

  return { ...s, status: "consumed", consumedAt: Date.parse(consumedAt) };
}

/** Throttle: empêche poll < 4s entre 2 polls. Update lastPollAt en Sheet. */
export async function canPoll(deviceCode: string): Promise<boolean> {
  const row = await findRowByDeviceCode(deviceCode);
  if (row < 0) return false;

  const sheets = getSheets();
  const cellRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!G${row}`,
  });
  const lastStr = cellRes.data.values?.[0]?.[0];
  const last = lastStr ? new Date(String(lastStr)).getTime() : 0;
  const now = Date.now();
  if (now - last < MIN_POLL_INTERVAL_MS) return false;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!G${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [[new Date(now).toISOString()]] },
  });
  return true;
}

export async function approveDevice(userCode: string, email: string): Promise<DeviceSession | null> {
  const row = await findRowByUserCode(userCode);
  if (row < 0) return null;

  const sheets = getSheets();
  const sessRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A${row}:H${row}`,
  });
  const sessRow = sessRes.data.values?.[0];
  if (!sessRow) return null;
  const s = rowToSession(sessRow.map(String));
  if (!s) return null;
  if (s.status !== "pending") return applyTTL(s);
  if (Date.now() >= s.expiresAt) {
    // Update status expired en Sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId(),
      range: `${deviceTab()}!D${row}`,
      valueInputOption: "RAW",
      requestBody: { values: [["expired"]] },
    });
    s.status = "expired";
    return s;
  }

  // Update email + status approved
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!C${row}:D${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [[email.trim().toLowerCase(), "approved"]] },
  });
  s.email = email.trim().toLowerCase();
  s.status = "approved";
  return s;
}

export async function denyDevice(userCode: string): Promise<DeviceSession | null> {
  const row = await findRowByUserCode(userCode);
  if (row < 0) return null;

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!D${row}`,
    valueInputOption: "RAW",
    requestBody: { values: [["denied"]] },
  });

  const sessRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A${row}:H${row}`,
  });
  const sessRow = sessRes.data.values?.[0];
  if (!sessRow) return null;
  const s = rowToSession(sessRow.map(String));
  if (!s) return null;
  s.status = "denied";
  return s;
}

export const DEVICE_FLOW_CONFIG = {
  expiresInSec: EXPIRES_MS / 1000,
  pollIntervalSec: MIN_POLL_INTERVAL_MS / 1000,
  userCodeLength: USER_CODE_LEN + 1,
};
