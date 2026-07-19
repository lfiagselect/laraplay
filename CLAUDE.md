@AGENTS.md

# LARAPLAY

Plateforme streaming privée style Netflix. Vidéos sur Bunny Stream (source unique, Drive retiré du runtime 2026-07-10), auth whitelist via Google Sheet (modif = effet immédiat). Déploiement VPS OVH (laraplay.inlasco.fr, systemd `laraplay` + Caddy).

## Stack

Next.js 16 (⚠️ breaking changes vs training data — lire `node_modules/next/dist/docs/` avant de coder, cf. AGENTS.md) · React 19 · Tailwind 4 · NextAuth v5 beta · googleapis · hls.js.

## Docs

- `README.md` — setup local, variables d'env, sécurité
- `LARAPLAY_HANDOFF_DEV_2026-05-11.pdf` — handoff dev

## Sécurité (règles à préserver)

- URLs Drive jamais exposées → streaming via proxy (`proxy.ts`)
- Service account JSON (`drive-key.json`) hors Git ; prod = `GOOGLE_SERVICE_ACCOUNT_JSON` inline Vercel
- Auth obligatoire partout sauf `/login`, `/unauthorized` (+ `/login-basic` fallback TV)

## Accès VPS (mis à jour 2026-07-14)

- Serveur : `vps-7295dffb.vps.ovh.net` — VPS-2 2027, 4 vCores, 8 Go RAM, 75 Go SSD, Ubuntu 26.04, Gravelines (GRA). IPv4 `51.255.162.184`.
- Déploiement app : systemd `laraplay.service` (`User=ubuntu`, `WorkingDirectory=/home/ubuntu/laraplay`) derrière Caddy.
- **Clé de déploiement persistée** : paire ed25519 `_deploy/laraplay_deploy` (+ `.pub`), générée le 14/07/2026, gitignorée (`_deploy/` dans `.gitignore`). Connexion : `ssh -i _deploy/laraplay_deploy ubuntu@51.255.162.184`. Ancienne clé introuvable (générée dans un sandbox éphémère par une session antérieure, jamais persistée) → accès repris via mode Rescue OVH (mot de passe temporaire à usage unique, disque `/dev/sdb1` monté pour ajouter la clé dans `/home/ubuntu/.ssh/authorized_keys`), validé par Nicolas.
- **Nettoyage à prévoir (non fait)** : `/home/ubuntu/.ssh/authorized_keys` contient encore 2 clés orphelines (`claude-laraplay-ops`, `claude-laraplay-ops-2026-07-10`) dont la partie privée est perdue — à supprimer lors d'une prochaine session si confirmé inutile.

## État (dernier commit : 2026-07-10, f81c063)

- Handoff Samsung TV 2026-07-10 appliqué et déployé sur le VPS :
  - Device flow durci : statut `consumed` (usage unique, compare-and-set), TTL vérifié sur tous statuts, `device_code` en cookie HttpOnly (jamais en URL), rate limit, purge Sheet, routes `/start`+`/poll` et `LoginTVClient` supprimés (flux unique = `/login-basic` meta-refresh).
  - Navigation D-pad : nav géométrique 2D (spatial-nav V3), sections TV sur toutes les pages/modales/lecteur, keep-horizontal, champs éditables respectés, Return hiérarchique (modale → lecteur `data-tv-back` → historique).
  - VIDEO-01 : Google Drive retiré du runtime (`/api/stream|thumb|drive`, `lib/drive`, `lib/preload`, DrivePlayer supprimés). Type partagé `lib/video-types.ts` (bunnyId requis). Erreurs config Bunny explicites.
  - Hero : démute uniquement via bouton Son (focusable TV) ; rotation carrousel pausée au focus.
  - CSS : token `--tv-root-size` unique (13px), focus 4px unique, règle flèches unique, fallback logo `@supports`.
  - Compat : browserslist `chrome >= 94` + `@csstools/postcss-cascade-layers` (0 `@layer` dans le build). Certification réelle Samsung (MAT-01..04) reste à faire sur matériel.
  - QA : `/api/tv-mode?key=<TV_TEST_KEY>&on=1|0` (staging only, env absente en prod = 404).
- Note handoff : son P0 AUTH-01 (« routes device absentes ») était FAUX (archive auditée incomplète) ; AUTH-02 (rejeu) était réel et est corrigé.
- Billboard 3 vidéos : toujours revert (cf. historique), ne pas re-tenter sans résoudre l'autoplay.

## Commandes

```bash
npm run dev        # localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint
```

## Notes

- `LARAPLAY.zip` (877 Mo, racine Projects) = archive complète pré-transfert, ignorable.
- Repo git présent. Transfert cloud PC→Mac peut laisser un `.git/index.lock` parasite → supprimer si git râle.
