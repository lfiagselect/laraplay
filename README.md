# LARAPLAY

Plateforme streaming privée. Stockage Google Drive. Authentification whitelist via Google Sheet.

Stack: Next.js 16 · React 19 · Tailwind 4 · NextAuth v5 · Google Drive API · Google Sheets API.

## Setup local

1. `npm install`
2. Configurer `.env.local` (voir `.env.example`)
3. Placer service account credentials dans `drive-key.json`
4. `npm run dev` → http://localhost:3000

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `GOOGLE_DRIVE_FOLDER_ID` | ID dossier racine vidéos |
| `GOOGLE_SHEET_ID` | ID Google Sheet whitelist emails |
| `GOOGLE_SHEET_TAB` | Nom onglet (défaut: `Autorisés`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Chemin fichier JSON (dev local) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON inline (production Vercel) |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `NEXTAUTH_SECRET` | Secret aléatoire 32 bytes base64 |
| `NEXTAUTH_URL` | URL site (auto Vercel) |

## Sécurité

- Service account JSON ignoré par Git
- Streaming proxy (URL Drive jamais exposée)
- Whitelist active live (modif Sheet = effet immédiat)
- Auth obligatoire sur toutes routes sauf `/login` et `/unauthorized`
