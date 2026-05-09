#!/usr/bin/env node
// LARAPLAY — Reconstruction du bunny-mapping.json depuis l'API Bunny + Drive
//
// Ce script récupère toutes les vidéos Bunny (titre = nom fichier Drive),
// liste toutes les vidéos Drive, et reconstruit le mapping driveId → bunnyId
// en faisant correspondre les noms de fichiers.
//
// Usage:
//   node scripts/rebuild-bunny-mapping.mjs
//
// Variables d'env requises (dans scripts/.env.migrate) :
//   GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
//   GOOGLE_DRIVE_FOLDER_ID=xxx
//   BUNNY_LIBRARY_ID=656728
//   BUNNY_API_KEY=xxx

import { writeFileSync, existsSync, readFileSync } from "fs";
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env.migrate") });

const require = createRequire(import.meta.url);
const { google } = require("googleapis");

const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

const MAPPING_FILE = resolve(__dirname, "bunny-mapping.json");
const BUNNY_API = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}`;

if (!BUNNY_LIBRARY_ID || !BUNNY_API_KEY || !DRIVE_FOLDER_ID || !SA_JSON) {
  console.error("❌ Variables manquantes dans scripts/.env.migrate");
  process.exit(1);
}

// ── Google Drive setup ──────────────────────────────────────────────────────
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(SA_JSON),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

// ── Lister toutes les vidéos Bunny (pagination) ─────────────────────────────
async function listAllBunnyVideos() {
  const videos = [];
  let page = 1;
  const itemsPerPage = 100;

  console.log("🐇 Récupération des vidéos Bunny...");
  while (true) {
    const res = await fetch(
      `${BUNNY_API}/videos?page=${page}&itemsPerPage=${itemsPerPage}&orderBy=date`,
      { headers: { AccessKey: BUNNY_API_KEY } }
    );
    if (!res.ok) throw new Error(`Bunny API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const items = data.items ?? [];
    videos.push(...items);
    process.stdout.write(`   Page ${page} — ${videos.length}/${data.totalItems} vidéos\r`);
    if (videos.length >= data.totalItems || items.length === 0) break;
    page++;
  }
  console.log(`\n   ✅ ${videos.length} vidéos Bunny récupérées`);
  return videos; // [{ guid, title, ... }]
}

// ── Lister toutes les vidéos Drive récursivement ────────────────────────────
async function listAllDriveVideos(folderId) {
  const videos = [];
  const queue = [folderId];
  console.log("📂 Récupération des vidéos Drive...");

  while (queue.length > 0) {
    const currentFolder = queue.shift();
    let pageToken;
    do {
      const res = await drive.files.list({
        q: `'${currentFolder}' in parents and trashed = false`,
        fields: "files(id,name,mimeType),nextPageToken",
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      for (const f of res.data.files ?? []) {
        if (!f.id || !f.mimeType) continue;
        if (f.mimeType === "application/vnd.google-apps.folder") {
          queue.push(f.id);
        } else if (f.mimeType.startsWith("video/")) {
          videos.push({ id: f.id, name: f.name });
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }
  console.log(`   ✅ ${videos.length} vidéos Drive récupérées`);
  return videos; // [{ id, name }]
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔄 LARAPLAY — Reconstruction bunny-mapping.json\n");

  const [bunnyVideos, driveVideos] = await Promise.all([
    listAllBunnyVideos(),
    listAllDriveVideos(DRIVE_FOLDER_ID),
  ]);

  // Index Bunny par titre normalisé (lowercase, trim)
  const bunnyByTitle = new Map();
  for (const v of bunnyVideos) {
    const key = (v.title ?? "").trim().toLowerCase();
    if (key) bunnyByTitle.set(key, v.guid);
  }

  // Construire le mapping driveId → bunnyId
  const mapping = {};
  let matched = 0;
  let unmatched = 0;
  const unmatchedList = [];

  for (const driveVideo of driveVideos) {
    const key = (driveVideo.name ?? "").trim().toLowerCase();
    const bunnyId = bunnyByTitle.get(key);
    if (bunnyId) {
      mapping[driveVideo.id] = bunnyId;
      matched++;
    } else {
      unmatched++;
      unmatchedList.push(driveVideo.name);
    }
  }

  // Sauvegarder
  writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

  console.log(`\n🏁 Résultat :`);
  console.log(`   ✅ ${matched} vidéos mappées`);
  console.log(`   ⚠️  ${unmatched} vidéos sans correspondance Bunny`);
  console.log(`💾 Mapping sauvegardé dans scripts/bunny-mapping.json`);

  if (unmatchedList.length > 0) {
    console.log(`\n⚠️  Vidéos Drive sans correspondance Bunny :`);
    unmatchedList.slice(0, 20).forEach((name) => console.log(`   - ${name}`));
    if (unmatchedList.length > 20) {
      console.log(`   ... et ${unmatchedList.length - 20} autres`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
