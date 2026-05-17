// LARAPLAY — Device Flow OAuth 2.0 (RFC 8628 inspired).
// V2: store Google Sheet (onglet "DeviceFlow") au lieu de Map mémoire.
// Survit cold start Netlify + multi-instances.
//
// Sheet schema (onglet GOOGLE_SHEET_DEVICEFLOW_TAB, défaut "DeviceFlow"):
//   A: device_code (hex 64)
//   B: user_code (XXXX-XXXX)
//   C: email (vide tant que pending/expired/denied)
//   D: status (pending|approved|expired|denied)
//   E: createdAt (ISO 8601)
//   F: expiresAt (ISO 8601)
//   G: lastPollAt (ISO 8601, throttle)
//
// TV: POST /start → reçoit { device_code, user_code, verification_uri, expires_in, interval }
// TV poll: POST /poll { device_code } → { status, email? }
// Phone: POST /verify { user_code } → marque approved + email.

import crypto from "crypto";
import { getSheets } from "./google";

export interface DeviceSession {
  deviceCode: string;
  userCode: string;
  email: string | null;
  status: "pending" | "approved" | "expired" | "denied";
  createdAt: number;
  expiresAt: number;
  lastPollAt: number;
}

const EXPIRES_MS = 10 * 60_000; // 10 min
const MIN_POLL_INTERVAL_MS = 4_000;

// Charset user-friendly (sans 0/O/1/I confusion)
const USER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USER_CODE_LEN = 8;

function deviceTab(): string {
  return process.env.GOOGLE_SHEET_DEVICEFLOW_TAB ?? "DeviceFlow";
}

function sheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID missing");
  return id;
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
  ];
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
  };

  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A:G`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [sessionToRow(session)] },
  });

  return session;
}

export async function getByDeviceCode(deviceCode: string): Promise<DeviceSession | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A2:G`,
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => String(r[0] ?? "") === deviceCode);
  if (!row) return null;
  const s = rowToSession(row);
  if (!s) return null;
  // Auto-expire si dépassé
  if (s.expiresAt < Date.now() && s.status === "pending") {
    s.status = "expired";
  }
  return s;
}

export async function getByUserCode(userCode: string): Promise<DeviceSession | null> {
  const wanted = normalizeUserCode(userCode);

  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId(),
    range: `${deviceTab()}!A2:G`,
  });
  const rows = res.data.values ?? [];
  const row = rows.find((r) => normalizeUserCode(String(r[1] ?? "")) === wanted);
  if (!row) return null;
  const s = rowToSession(row);
  if (!s) return null;
  if (s.expiresAt < Date.now() && s.status === "pending") {
    s.status = "expired";
  }
  return s;
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
    range: `${deviceTab()}!A${row}:G${row}`,
  });
  const sessRow = sessRes.data.values?.[0];
  if (!sessRow) return null;
  const s = rowToSession(sessRow);
  if (!s) return null;
  if (s.status !== "pending") return s;
  if (s.expiresAt < Date.now()) {
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
    range: `${deviceTab()}!A${row}:G${row}`,
  });
  const sessRow = sessRes.data.values?.[0];
  if (!sessRow) return null;
  const s = rowToSession(sessRow);
  if (!s) return null;
  s.status = "denied";
  return s;
}

export const DEVICE_FLOW_CONFIG = {
  expiresInSec: EXPIRES_MS / 1000,
  pollIntervalSec: MIN_POLL_INTERVAL_MS / 1000,
  userCodeLength: USER_CODE_LEN + 1,
};
