export const CANONICAL_APP_ORIGIN = "https://laraplay.inlasco.fr";

function normalizedOrigin(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "::1"].indexOf(
      url.hostname.toLowerCase(),
    ) !== -1;
    if (process.env.NODE_ENV === "production" && (loopback || url.protocol !== "https:")) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/** Origine explicitement configurée pour les URLs publiques de l'application. */
export function configuredAppOrigin(): string | null {
  // En production, PUBLIC_APP_URL est l'unique override volontaire. AUTH_URL
  // et NEXTAUTH_URL restent la configuration Auth.js et ne doivent pas faire
  // dériver silencieusement les URLs TV vers un ancien hébergement.
  if (process.env.NODE_ENV === "production") {
    return normalizedOrigin(process.env.PUBLIC_APP_URL);
  }
  return (
    normalizedOrigin(process.env.PUBLIC_APP_URL) ??
    normalizedOrigin(process.env.AUTH_URL) ??
    normalizedOrigin(process.env.NEXTAUTH_URL)
  );
}

export function canonicalAppOrigin(): string {
  return configuredAppOrigin() ?? CANONICAL_APP_ORIGIN;
}
