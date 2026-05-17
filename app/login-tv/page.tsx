// LARAPLAY — Page login TV (Device Flow).
// Affiche code à 8 chars + URL courte. Poll backend toutes 5s.
// Quand status=approved → signIn("device", { device_code }) → cookie session → redirect /.

import { headers } from "next/headers";
import { LoginTVClient, type DeviceStartResponse } from "@/components/LoginTVClient";
import { createDeviceSession, DEVICE_FLOW_CONFIG } from "@/lib/device-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getPublicOrigin(hdrs: Headers): string {
  if (process.env.NEXTAUTH_URL) {
    try {
      return new URL(process.env.NEXTAUTH_URL).origin;
    } catch {
      // ignore, fallback headers
    }
  }

  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "laraplay.com";
  return `${proto}://${host}`;
}

async function startDeviceFlow(): Promise<{
  data: DeviceStartResponse | null;
  error: string | null;
}> {
  try {
    const [session, hdrs] = await Promise.all([createDeviceSession(), headers()]);
    const origin = getPublicOrigin(hdrs);
    return {
      data: {
        device_code: session.deviceCode,
        user_code: session.userCode,
        verification_uri: `${origin}/d`,
        expires_in: DEVICE_FLOW_CONFIG.expiresInSec,
        interval: DEVICE_FLOW_CONFIG.pollIntervalSec,
      },
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[login-tv] server device/start failed:", msg);
    return {
      data: null,
      error: `Impossible de préparer la connexion TV: ${msg.slice(0, 160)}`,
    };
  }
}

export default async function LoginTVPage() {
  const { data, error } = await startDeviceFlow();

  return (
    <div className="login-tv-page min-h-screen bg-black flex items-center justify-center px-6 py-4 md:px-8">
      <LoginTVClient initialData={data} initialError={error} />
    </div>
  );
}
