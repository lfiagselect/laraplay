// LARAPLAY — Bunny CDN Token Authentication
// Signe les URLs streaming Bunny pour empêcher le hotlinking et bypass whitelist.
// Bunny doc: https://docs.bunny.net/docs/cdn-token-authentication
//
// Activer dans Bunny dashboard → Pull Zone → Security → Token Authentication.
// Récupérer "Security Token Key" → BUNNY_SECURITY_KEY env var.
//
// Format URL signée:
//   https://{pullzone}/{path}?token={hash}&expires={unix_ts}
// Hash = SHA256(security_key + path + expires).toString("base64url")

import crypto from "crypto";

const DEFAULT_TTL_S = 4 * 3600; // 4 heures

/**
 * Signe une URL Bunny avec token. Retourne URL avec ?token=...&expires=...
 *
 * @param pathFromRoot  chemin après le pull zone (ex: "/abc-123/playlist.m3u8")
 * @param ttlSec        TTL en secondes (default 4h)
 * @returns URL complète signée, ou null si BUNNY_SECURITY_KEY absente (fallback non signé)
 */
export function signBunnyPath(pathFromRoot: string, ttlSec: number = DEFAULT_TTL_S): { token: string; expires: number } | null {
  const key = process.env.BUNNY_SECURITY_KEY;
  if (!key) return null;

  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  // Bunny path doit commencer par "/"
  const path = pathFromRoot.startsWith("/") ? pathFromRoot : "/" + pathFromRoot;

  // SHA256(security_key + path + expires) → base64url (Bunny attend Base64URL)
  const hash = crypto
    .createHash("sha256")
    .update(key + path + expires)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { token: hash, expires };
}

/**
 * Build URL Bunny pull zone signée pour une vidéo.
 * @param bunnyId       GUID vidéo Bunny
 * @param filename      ex: "playlist.m3u8" | "play_720p.mp4"
 * @returns URL complète signée, ou URL non signée si BUNNY_SECURITY_KEY absente
 */
export function bunnyStreamUrl(bunnyId: string, filename = "playlist.m3u8"): string | null {
  const zone = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE;
  if (!zone) return null;

  const path = `/${bunnyId}/${filename}`;
  const base = `https://${zone}${path}`;

  const sig = signBunnyPath(path);
  if (!sig) return base; // BUNNY_SECURITY_KEY non set → URL nue (DEV/transition)

  return `${base}?token=${sig.token}&expires=${sig.expires}`;
}
