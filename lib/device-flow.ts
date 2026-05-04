// LARAPLAY — Device Flow OAuth 2.0 (RFC 8628 inspired).
// Store mémoire process. Codes éphémères 10 min. Vercel cdg1 = single region OK.
// TV: POST /start → reçoit { device_code, user_code, verification_uri, expires_in, interval }
// TV poll: POST /poll { device_code } → { status: "pending"|"approved"|"expired"|"denied", email? }
// Phone: POST /verify { user_code } → redirige Google OAuth, callback marque approved + email.

import crypto from "crypto";

export interface DeviceSession {
  deviceCode: string;
  userCode: string;
  email: string | null;
  status: "pending" | "approved" | "expired" | "denied";
  createdAt: number;
  expiresAt: number;
  lastPollAt: number;
}

const STORE = new Map<string, DeviceSession>();
const USER_CODE_INDEX = new Map<string, string>(); // user_code → device_code

const EXPIRES_MS = 10 * 60_000; // 10 min
const MIN_POLL_INTERVAL_MS = 4_000;

// Charset user-friendly (sans 0/O/1/I confusion)
const USER_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USER_CODE_LEN = 8;

function genUserCode(): string {
  const buf = crypto.randomBytes(USER_CODE_LEN);
  let out = "";
  for (let i = 0; i < USER_CODE_LEN; i++) {
    out += USER_CODE_CHARS[buf[i] % USER_CODE_CHARS.length];
  }
  // Format AAAA-BBBB lisibilité
  return out.slice(0, 4) + "-" + out.slice(4);
}

function genDeviceCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Nettoie sessions expirées (called opportunistiquement). */
function gc() {
  const now = Date.now();
  for (const [code, s] of STORE) {
    if (s.expiresAt < now) {
      STORE.delete(code);
      USER_CODE_INDEX.delete(s.userCode);
    }
  }
}

export function createDeviceSession(): DeviceSession {
  gc();
  // Évite collision user_code (rare avec 32^8 ≈ 1e12)
  let userCode: string;
  do {
    userCode = genUserCode();
  } while (USER_CODE_INDEX.has(userCode));

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
  STORE.set(deviceCode, session);
  USER_CODE_INDEX.set(userCode, deviceCode);
  return session;
}

export function getByDeviceCode(deviceCode: string): DeviceSession | null {
  gc();
  const s = STORE.get(deviceCode);
  if (!s) return null;
  if (s.expiresAt < Date.now()) {
    s.status = "expired";
  }
  return s;
}

export function getByUserCode(userCode: string): DeviceSession | null {
  gc();
  const normalized = userCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  // Tolère saisie sans tiret
  const withDash =
    normalized.length === USER_CODE_LEN
      ? normalized.slice(0, 4) + "-" + normalized.slice(4)
      : normalized;
  const dc = USER_CODE_INDEX.get(withDash);
  if (!dc) return null;
  return getByDeviceCode(dc);
}

/** Throttle: empêche poll < 4s entre 2 polls (anti-flood). */
export function canPoll(deviceCode: string): boolean {
  const s = STORE.get(deviceCode);
  if (!s) return false;
  const now = Date.now();
  if (now - s.lastPollAt < MIN_POLL_INTERVAL_MS) return false;
  s.lastPollAt = now;
  return true;
}

export function approveDevice(userCode: string, email: string): DeviceSession | null {
  const s = getByUserCode(userCode);
  if (!s) return null;
  if (s.status !== "pending") return null;
  if (s.expiresAt < Date.now()) {
    s.status = "expired";
    return s;
  }
  s.email = email.trim().toLowerCase();
  s.status = "approved";
  return s;
}

export function denyDevice(userCode: string): DeviceSession | null {
  const s = getByUserCode(userCode);
  if (!s) return null;
  s.status = "denied";
  return s;
}

export const DEVICE_FLOW_CONFIG = {
  expiresInSec: EXPIRES_MS / 1000,
  pollIntervalSec: MIN_POLL_INTERVAL_MS / 1000,
  userCodeLength: USER_CODE_LEN + 1, // +1 pour tiret
};
