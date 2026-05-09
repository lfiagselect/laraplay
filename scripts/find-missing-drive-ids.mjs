#!/usr/bin/env node
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, ".env.migrate") });

const require = createRequire(import.meta.url);
const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

// Recherche par mots-clés (sans guillemets) puis filtre exact
const targets = [
  { keywords: "Enforés 1998 Répétitions Requiem", exact: "Les Enfoirés 1998 - Répétitions \u00ab Requiem pour un fou \u00bb.mp4" },
  { keywords: "Lara Fabian Teaser Suis TOUR 2026", exact: "Lara Fabian - Teaser \u00ab Je Suis L\u00e0 TOUR \u00bb 2026.mp4" },
  { keywords: "Documentaire LARA", exact: "Documentaire \u00ab LARA \u00bb.mp4" },
];

async function main() {
  for (const t of targets) {
    // Cherche par fullText (moins précis mais contourne les guillemets)
    const res = await drive.files.list({
      q: `fullText contains '${t.keywords.split(" ")[0]}' and trashed = false`,
      fields: "files(id,name)",
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const match = (res.data.files ?? []).find((f) => f.name === t.exact);
    if (match) {
      console.log(`\u2705 ${match.id}  ||  ${match.name}`);
    } else {
      // Fallback : cherche par nom partiel sans guillemets
      const words = t.exact.replace(/[\u00ab\u00bb]/g, "").replace(/\s+/g, " ").trim();
      console.log(`❌ NOT FOUND pour : ${t.exact}`);
      console.log(`   Candidats :`);
      (res.data.files ?? []).slice(0, 3).forEach((f) => console.log(`   - ${f.id}  ${f.name}`));
    }
  }
}

main().catch(console.error);
