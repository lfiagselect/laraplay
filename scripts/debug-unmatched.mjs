#!/usr/bin/env node
// Debug : pour chaque vidéo Drive non matchée, affiche les titres Bunny
// qui contiennent des mots-clés communs (pour trouver la vraie différence).

import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env.migrate") });

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_API = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}`;

// Les 8 vidéos non matchées (noms Drive)
const UNMATCHED = [
  "Lara  Fabian - Je Suis La Tour - Live @ Toulouse 2025.mp4",
  "20h30 le dimanche (01/12/2024).mp4",
  "50' Inside (23 mars 2024).mp4",
  "12/45, M6 16/02/2024.mp4",
  "Les Enfoirés 1998 - Répétitions \u00ab Requiem pour un fou \u00bb.mp4",
  "Lara Fabian - Teaser \u00ab Je Suis L\u00e0 TOUR \u00bb 2026.mp4",
  "Documentaire \u00ab LARA \u00bb.mp4",
  "Lara Fabian -  I Will Always Love You (Live At Si On S'aimait, France, 1998).mp4",
];

// Extrait 1-2 mots-clés courts et distinctifs d'un nom
function keywords(name) {
  return name
    .toLowerCase()
    .replace(/\.(mp4|mkv|avi|mov|webm)$/i, "")
    .split(/[\s\-\/,()\[\]<>«»''\u2018\u2019]+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);
}

async function listAllBunnyVideos() {
  const videos = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${BUNNY_API}/videos?page=${page}&itemsPerPage=100&orderBy=date`,
      { headers: { AccessKey: BUNNY_API_KEY } }
    );
    const data = await res.json();
    videos.push(...(data.items ?? []));
    if (videos.length >= data.totalItems || (data.items ?? []).length === 0) break;
    page++;
  }
  return videos;
}

async function main() {
  console.log("\n🔍 Debug matching Bunny — titres proches des 8 non-matchées\n");
  const bunny = await listAllBunnyVideos();
  console.log(`${bunny.length} vidéos Bunny chargées\n`);

  for (const driveName of UNMATCHED) {
    const kws = keywords(driveName);
    console.log(`\n📁 DRIVE : "${driveName}"`);
    console.log(`   mots-clés : ${kws.join(", ")}`);
    console.log(`   Bunny candidates :`);

    const candidates = bunny.filter((v) => {
      const t = (v.title ?? "").toLowerCase();
      return kws.some((k) => t.includes(k));
    });

    if (candidates.length === 0) {
      console.log(`   ❌ aucun candidat trouvé`);
    } else {
      candidates.slice(0, 5).forEach((v) =>
        console.log(`   ✅ guid=${v.guid}  titre="${v.title}"`)
      );
    }
  }
}

main().catch(console.error);
