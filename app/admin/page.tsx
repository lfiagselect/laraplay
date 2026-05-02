// LARAPLAY — Page admin
// Server : check auth + role admin. Sinon redirect.
// Client : <AdminClient> charge la liste via API et permet add/remove.

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { AdminClient } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] font-bold mb-2">
            Administration
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Utilisateurs autorisés
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Gestion de la whitelist Google Sheet (lecture/écriture).
          </p>
        </div>

        <AdminClient />
      </main>
    </div>
  );
}
