// LARAPLAY — Page login minimaliste

import { signIn } from "@/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { detectTVServer } from "@/lib/tv";
import { LoginTVRedirect } from "@/components/LoginTVRedirect";
import { LoginSubmitButton } from "@/components/LoginSubmitButton";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Connexion refusée. Utilisez le compte Google associé à votre invitation.",
  OAuthAccountNotLinked: "Ce compte Google est déjà associé à une autre méthode de connexion.",
  OAuthSignin: "Google n’a pas pu démarrer la connexion. Réessayez.",
  OAuthCallback: "Google n’a pas pu terminer la connexion. Réessayez.",
  OAuthCallbackError: "Google n’a pas pu terminer la connexion. Réessayez.",
  Verification: "Le lien de connexion n’est plus valide.",
  MissingCSRF: "Votre session de connexion a expiré. Rechargez la page et réessayez.",
  SessionRequired: "Votre session a expiré. Connectez-vous à nouveau.",
};

function authErrorMessage(code?: string | string[]): string | null {
  if (typeof code !== "string" || !code) return null;
  return AUTH_ERROR_MESSAGES[code] ??
    "Le service de connexion est temporairement indisponible. Réessayez.";
}

function safeCallbackUrl(value?: string | string[]): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const target = new URL(value, "https://laraplay.invalid");
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const hdrs = await headers();
  if (detectTVServer(hdrs.get("user-agent"))) {
    redirect("/login-basic");
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-8">
      <LoginTVRedirect />
      <div className="w-full max-w-sm flex flex-col items-center">
        <h1 className="logo-wordmark text-6xl md:text-7xl mb-12 select-none">
          LARAPLAY
        </h1>

        <div className="w-full">
          <LoginForm searchParamsPromise={searchParams} />
        </div>

        <p className="mt-8 text-sm text-zinc-400 text-center leading-relaxed">
          Plateforme privée · Utilisez le compte Google associé à votre invitation
        </p>
      </div>
    </div>
  );
}

async function LoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParamsPromise;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  const errorMessage = authErrorMessage(params.error);

  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: callbackUrl });
      }}
    >
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="mb-5 p-3 bg-red-950/60 border border-red-800/60 text-red-200 text-sm rounded-lg text-center"
        >
          {errorMessage}
        </div>
      )}
      <LoginSubmitButton />
      <a
        href="/login-basic"
        data-focusable
        className="tv-login-link mt-4 min-h-11 flex items-center justify-center text-sm text-zinc-300 hover:text-white underline underline-offset-4"
      >
        Se connecter sur un téléviseur
      </a>
    </form>
  );
}
