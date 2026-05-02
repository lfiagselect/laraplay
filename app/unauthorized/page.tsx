// LARAPLAY — Page accès refusé (cohérente avec login premium)

import { signOut } from "@/auth";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Background blurré */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-fallback/leffet-lara.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-[2px] opacity-30"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.75)_60%,_#000_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />

      <header className="relative z-20 px-6 md:px-12 pt-8 pb-4">
        <Link href="/login" aria-label="LARAPLAY">
          <span className="logo-wordmark text-3xl md:text-4xl select-none">
            LARAPLAY
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-100px)] items-center justify-center px-6 py-8">
        <div className="w-full max-w-md animate-modal-enter">
          <div className="rounded-2xl bg-black/75 backdrop-blur-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] p-8 md:p-10 text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--accent)] font-bold mb-3">
              Accès restreint
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
              Accès refusé
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-8">
              Cet email n&apos;est pas dans la liste des utilisateurs autorisés.
              <br />
              Contacte l&apos;administrateur pour demander un accès.
            </p>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3 px-4 rounded-lg active:scale-[0.98] transition"
              >
                Retour à la connexion
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
