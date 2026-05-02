// LARAPLAY — Page login premium
// Background poster fullscreen + gradient cinématographique
// Card centrée avec backdrop-blur, logo monumental, animations entrée

import { signIn } from "@/auth";
import Link from "next/link";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Background poster — image hero blurrée pour ambiance */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-fallback/leffet-lara.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] opacity-40"
      />

      {/* Vignette gradients cinématographiques */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.7)_60%,_#000_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />

      {/* Header minimal — logo seul */}
      <header className="relative z-20 px-6 md:px-12 pt-8 pb-4">
        <Link href="/login" aria-label="LARAPLAY">
          <span className="logo-wordmark text-3xl md:text-4xl select-none">
            LARAPLAY
          </span>
        </Link>
      </header>

      {/* Card login centrée */}
      <main className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-6 py-8">
        <div className="w-full max-w-md animate-modal-enter">
          <div className="rounded-2xl bg-black/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] p-8 md:p-10">
            {/* Branding monumental */}
            <div className="text-center mb-8">
              <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--accent)] font-bold mb-3">
                Streaming privé
              </p>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
                Bienvenue
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Plateforme exclusive · Accès sur invitation
              </p>
            </div>

            <LoginForm searchParamsPromise={searchParams} />

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                En continuant, vous acceptez les conditions d&apos;utilisation
                de cette plateforme privée. Votre compte Google est utilisé
                uniquement pour authentification.
              </p>
            </div>
          </div>

          {/* Hint sous la card */}
          <p className="mt-6 text-center text-xs text-zinc-600">
            Tu n&apos;as pas accès ? Contacte l&apos;administrateur.
          </p>
        </div>
      </main>
    </div>
  );
}

async function LoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParamsPromise;
  const callbackUrl = params.callbackUrl ?? "/";
  const error = params.error;

  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: callbackUrl });
      }}
    >
      {error && (
        <div className="mb-5 p-3 bg-red-950/60 border border-red-800/60 text-red-300 text-sm rounded-lg backdrop-blur">
          {error === "AccessDenied"
            ? "Accès refusé. Cet email n'est pas autorisé."
            : `Erreur : ${error}`}
        </div>
      )}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-bold py-3.5 px-4 rounded-lg hover:bg-zinc-100 active:scale-[0.98] shadow-lg transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuer avec Google
      </button>
    </form>
  );
}
