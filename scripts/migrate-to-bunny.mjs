#!/usr/bin/env node
// LARAPLAY — Migration Drive → Bunny Stream
// Pipe direct ReadableStream Drive → Bunny Upload API (zéro fichier temp local).
// Résumé automatique : les vidéos déjà dans bunny-mapping.json sont ignorées.
// Produit bunny-mapping.json : { driveId: bunnyVideoId }
//
// Usage:
//   node scripts/migrate-to-bunny.mjs
//
// Variables d'env requises (dans scripts/.env.migrate) :
//   GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
//   GOOGLE_DRIVE_FOLDER_ID=xxx
//   BUNNY_LIBRARY_ID=656728
//   BUNNY_API_KEY=xxx

import { readFileSync, writeFileSync, existsSync } from "fs";
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
const CONCURRENCY = 2; // uploads simultanés (ne pas dépasser 3)

if (!BUNNY_LIBRARY_ID || !BUNNY_API_KEY || !DRIVE_FOLDER_ID || !SA_JSON) {
  console.error("Variables manquantes dans scripts/.env.migrate");
  process.exit(1);
}

// ── Google Drive setup ──────────────────────────────────────────────────────
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(SA_JSON),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

async function getAccessToken() {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

// ── Lister toutes les vidéos Drive récursivement ────────────────────────────
async function listAllVideos(folderId) {
  const videos = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentFolder = queue.shift();
    let pageToken;
    do {
      const res = await drive.files.list({
        q: `'${currentFolder}' in parents and trashed = false`,
        fields: "files(id,name,mimeType,size,parents),nextPageToken",
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
          videos.push({ id: f.id, name: f.name, size: f.size });
        }
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }
  return videos;
}

// ── Créer une vidéo dans Bunny et obtenir son upload URL ────────────────────
async function createBunnyVideo(title) {
  const res = await fetch(`${BUNNY_API}/videos`, {
    method: "POST",
    headers: {
      AccessKey: BUNNY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Bunny create failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.guid; // bunnyVideoId
}

// ── Uploader un stream Drive vers Bunny (pipe direct) ────────────────────────
async function uploadToBunny(bunnyVideoId, driveFileId, title) {
  const token = await getAccessToken();
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&supportsAllDrives=true`;

  // Stream Drive
  const driveRes = await fetch(driveUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!driveRes.ok) throw new Error(`Drive stream failed: ${driveRes.status}`);

  // Pipe direct vers Bunny
  const uploadRes = await fetch(`${BUNNY_API}/videos/${bunnyVideoId}`, {
    method: "PUT",
    headers: {
      AccessKey: BUNNY_API_KEY,
      "Content-Type": "application/octet-stream",
    },
    body: driveRes.body,
    // @ts-ignore — duplex requis pour body streaming en Node 18+
    duplex: "half",
  });
  if (!uploadRes.ok) throw new Error(`Bunny upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
}

// ── Traitement en pool de concurrence limitée ───────────────────────────────
async function processPool(items, fn, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🐇 LARAPLAY — Migration Drive → Bunny Stream\n");

  // Charger mapping existant (reprise automatique)
  const mapping = existsSync(MAPPING_FILE)
    ? JSON.parse(readFileSync(MAPPING_FILE, "utf-8"))
    : {};

  console.log(`📂 Listing vidéos Drive...`);
  const videos = await listAllVideos(DRIVE_FOLDER_ID);
  console.log(`   ${videos.length} vidéos trouvées`);

  const pending = videos.filter((v) => !mapping[v.id]);
  console.log(`   ${Object.keys(mapping).length} déjà migrées, ${pending.length} restantes\n`);

  if (pending.length === 0) {
    console.log("✅ Tout est déjà migré !");
    return;
  }

  let done = 0;
  let errors = 0;

  await processPool(pending, async (video, idx) => {
    const label = `[${idx + 1}/${pending.length}] ${video.name}`;
    try {
      const sizeMB = video.size ? (parseInt(video.size) / 1024 / 1024).toFixed(0) + " MB" : "? MB";
      process.stdout.write(`⏳ ${label} (${sizeMB})...`);

      const bunnyId = await createBunnyVideo(video.name);
      await uploadToBunny(bunnyId, video.id, video.name);

      mapping[video.id] = bunnyId;
      // Sauvegarde incrémentale après chaque vidéo (reprise possible)
      writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

      done++;
      console.log(` ✅ ${bunnyId}`);
    } catch (err) {
      errors++;
      console.log(` ❌ ${err.message}`);
    }
  }, CONCURRENCY);

  console.log(`\n🏁 Terminé : ${done} migrées, ${errors} erreurs`);
  console.log(`💾 Mapping sauvegardé dans scripts/bunny-mapping.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
