#!/usr/bin/env node
// Liste les guid Bunny qui ne sont PAS dans bunny-mapping.json
// = les vidéos Bunny "orphelines" non liées à un driveId
// Permet d'identifier à la main les 8 vidéos manquantes.

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env.migrate") });

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_API = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}`;
const MAPPING_FILE = resolve(__dirname, "bunny-mapping.json");

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
  const mapping = existsSync(MAPPING_FILE)
    ? JSON.parse(readFileSync(MAPPING_FILE, "utf-8"))
    : {};

  const mappedGuids = new Set(Object.values(mapping));
  const bunny = await listAllBunnyVideos();

  const orphans = bunny.filter((v) => !mappedGuids.has(v.guid));

  console.log(`\n🐇 Vidéos Bunny non mappées (${orphans.length}) :\n`);
  orphans.forEach((v) => {
    console.log(`  guid=${v.guid}`);
    console.log(`  titre="${v.title}"`);
    console.log();
  });
}

main().catch(console.error);
