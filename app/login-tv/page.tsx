// LARAPLAY — Page login TV (Device Flow).
// Affiche code à 8 chars + URL courte. Poll backend toutes 5s.
// Quand status=approved → signIn("device", { device_code }) → cookie session → redirect /.

import { LoginTVClient } from "@/components/LoginTVClient";

export const dynamic = "force-dynamic";

export default function LoginTVPage() {
  return (
    <div className="login-tv-page min-h-screen bg-black flex items-center justify-center px-6 py-4 md:px-8">
      <LoginTVClient />
    </div>
  );
}
