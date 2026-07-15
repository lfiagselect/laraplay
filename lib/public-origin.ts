import "server-only";
import { canonicalAppOrigin, configuredAppOrigin } from "./app-origin";

/** Origine publique fiable derrière Caddy, sans fuite de localhost en prod. */
export function publicOrigin(req: Request): string {
  const configured = configuredAppOrigin();
  if (configured) return configured;

  // En production, ne jamais construire une redirection depuis Host ou
  // X-Forwarded-Host : ces en-têtes peuvent être forgés si le proxy est mal
  // configuré. PUBLIC_APP_URL reste l'override explicite pour un autre domaine.
  if (process.env.NODE_ENV === "production") return canonicalAppOrigin();

  const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  const host = (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host
  ).split(",")[0].trim();

  try {
    const forwardedOrigin = new URL(`${proto}://${host}`).origin;
    return forwardedOrigin;
  } catch {
    // Le fallback canonique ci-dessous reste sûr et déterministe.
  }

  return new URL(req.url).origin;
}

export function publicUrl(req: Request, path: string): URL {
  const origin = publicOrigin(req);
  const target = new URL(path, `${origin}/`);
  // Même si une bibliothèque renvoie accidentellement une URL absolue, garder
  // le chemin mais imposer l'origine publique canonique (anti open-redirect).
  return new URL(`${target.pathname}${target.search}${target.hash}`, `${origin}/`);
}
