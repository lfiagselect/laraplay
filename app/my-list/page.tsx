// LARAPLAY — Page Ma liste (favoris)
// Récupère IDs localStorage côté client, fetch metadata via API.

import { Header } from "@/components/Header";
import { MyListClient } from "@/components/MyListClient";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function MyListPage() {
  const session = await auth();
  const userEmail = session?.user?.email ?? null;

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 md:px-12 pt-20 md:pt-24 pb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Ma liste
        </h1>
        <p className="text-zinc-400 mb-8">Tes vidéos favorites</p>
        <MyListClient userEmail={userEmail} />
      </main>
    </div>
  );
}
