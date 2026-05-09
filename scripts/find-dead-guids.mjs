#!/usr/bin/env node
// Trouve les driveId dont le bunnyId n'existe plus dans Bunny
// et les supprime du mapping pour permettre un re-upload.

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env.migrate") });

const LIB = process.env.BUNNY_LIBRARY_ID;
const KEY = process.env.BUNNY_API_KEY;
const MAPPING_FILE = resolve(__dirname, "bunny-mapping.json");

async function main() {
  const mapping = JSON.parse(readFileSync(MAPPING_FILE, "utf-8"));
  const entries = Object.entries(mapping);
  const dead = [];

  console.log(`\n🔍 Vérification de ${entries.length} GUIDs Bunny...\n`);

  // Vérification par batch de 10 pour ne pas surcharger l'API
  for (let i = 0; i < entries.length; i += 10) {
    const batch = entries.slice(i, i + 10);
    await Promise.all(batch.map(async ([driveId, bunnyId]) => {
      const r = await fetch(
        `https://video.bunnycdn.com/library/${LIB}/videos/${bunnyId}`,
        { headers: { AccessKey: KEY } }
      );
      if (r.status === 404) {
        dead.push({ driveId, bunnyId });
        console.log(`❌ MORT : ${bunnyId} (driveId=${driveId})`);
      }
    }));
    process.stdout.write(`   ${Math.min(i + 10, entries.length)}/${entries.length}\r`);
  }

  console.log(`\n\n🏁 Total GUIDs morts : ${dead.length}`);

  if (dead.length > 0) {
    // Supprimer les entrées mortes du mapping
    for (const { driveId } of dead) {
      delete mapping[driveId];
    }
    writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));
    console.log(`💾 Mapping nettoyé — ${dead.length} entrées supprimées`);
    console.log(`\n👉 Relance migrate-to-bunny.mjs pour ré-uploader ces vidéos`);
  }
}

main().catch(console.error);
