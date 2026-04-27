// LARAPLAY — Page non autorisé
// Affiché si email Google pas dans whitelist Sheet.

import { signOut } from "@/auth";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur rounded-lg p-8 border border-zinc-800 text-center">
        <h1 className="text-4xl font-extrabold text-red-600 mb-4 tracking-tight">
          LARAPLAY
        </h1>
        <p className="text-zinc-300 text-lg mb-2">Accès refusé</p>
        <p className="text-zinc-500 text-sm mb-8">
          Ton email n'est pas dans la liste des utilisateurs autorisés.
          <br />
          Contacte l'administrateur pour demander un accès.
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-zinc-800 text-zinc-200 font-semibold py-3 px-4 rounded hover:bg-zinc-700 transition"
          >
            Retour à la connexion
          </button>
        </form>
      </div>
    </div>
  );
}
