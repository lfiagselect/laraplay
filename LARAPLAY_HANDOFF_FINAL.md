# LARAPLAY — Handoff final

Plateforme privée de streaming vidéo (Lara Fabian) hébergée sur Vercel,
contenus servis depuis Google Drive, whitelist email via Google Sheet.

Audit V5 (perf streaming) + audit UI V2 (Netflix-like) intégrés.
Panneau admin pour gestion utilisateurs.

---

## Stack technique

| Couche | Tech |
|---|---|
| Framework | Next.js 15 (App Router, RSC) |
| Auth | NextAuth v5 (Google OAuth) + whitelist Sheet |
| UI | React 19, Tailwind 4, Lucide icons |
| Storage vidéos | Google Drive (service account) |
| Whitelist users | Google Sheets (service account, read+write) |
| Hosting | Vercel (region cdg1, plan Hobby) |
| Logs | Vercel Logs (filter `[stream]`, `[perf]`, `[ping]`) |
| Cron | Vercel cron `/api/ping` 1×/jour (limite Hobby) |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Browser (Desktop / Mobile / PWA)                   │
│  ├─ Splash TUDUM → Hero vidéo → Carousel           │
│  ├─ Rows (Top10, Eras, Catégories, Continuer…)     │
│  └─ Player avec state machine + perf marks          │
└──────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  Next.js Vercel Serverless (cdg1)                   │
│  ├─ /api/stream/[id]   → proxy Drive (Range support)│
│  ├─ /api/thumb/[id]    → proxy Drive thumbnail      │
│  ├─ /api/video/[id]    → metadata + similaires      │
│  ├─ /api/videos-by-ids → batch lookup catalog       │
│  ├─ /api/ping          → warmup cron (public)       │
│  ├─ /api/log           → KPI events (auth)          │
│  ├─ /api/admin/whitelist (GET/POST/DELETE)         │
│  └─ /api/admin/formats → audit mimeTypes vidéo     │
│                                                      │
│  Catalog cache : unstable_cache 1h (byId Map)       │
│  Token Drive cache : 50min mémoire process          │
│  Whitelist cache : 5min mémoire                     │
└──────────────────────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
       ┌─────────────┐  ┌──────────────┐
       │ Google Drive│  │ Google Sheet │
       │ (vidéos)    │  │ (whitelist)  │
       └─────────────┘  └──────────────┘
```

---

## Variables d'environnement

À configurer dans **Vercel → Settings → Environment Variables** :

| Variable | Valeur | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | OAuth Google client | depuis Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth Google secret | idem |
| `GOOGLE_DRIVE_FOLDER_ID` | ID du dossier racine Drive | URL Drive du dossier |
| `GOOGLE_SHEET_ID` | ID du Sheet whitelist | URL Sheet |
| `GOOGLE_SHEET_TAB` | Nom du tab whitelist | défaut `Autorisés` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON complet du service account | string brut |
| `AUTH_SECRET` | secret NextAuth | `openssl rand -base64 32` |

---

## Permissions Google requises

### Drive (dossier vidéos)
Le service account (champ `client_email` du JSON) doit avoir un accès
**Lecteur** au dossier Drive contenant les vidéos.

### Sheet (whitelist)
Le service account doit avoir un accès **Éditeur** au Sheet (pas que Lecteur).
Sinon les écritures admin (POST/DELETE) renvoient 403.

Structure attendue du Sheet — tab `Autorisés` colonnes :
| Email | Nom | Actif | Date ajout | Role |
|---|---|---|---|---|
| `user@x.com` | Jean | TRUE | 2026-05-02 | user |
| `admin@x.com` | Admin | TRUE | 2026-05-01 | admin |

---

## Pages

| Route | Description | Accès |
|---|---|---|
| `/` | Home : hero + rows | logged-in |
| `/login` | Login Google | public |
| `/unauthorized` | Email pas whitelisté | public |
| `/categories` | Index catégories thématiques | logged-in |
| `/category/[slug]` | Détail catégorie | logged-in |
| `/eras` | Index ères chronologiques | logged-in |
| `/my-list` | Favoris user (localStorage) | logged-in |
| `/search` | Recherche | logged-in |
| `/watch/[id]` | Lecture vidéo | logged-in |
| `/admin` | Gestion whitelist | admin only |

---

## Optimisations livrées (audit V5)

### Performance backend
- **Catalog `byId` Map** : remplace 3 appels `getVideo()` Drive cold (~400ms gagnés sur TTFB lecture)
- **Token Drive cache** : 50min en mémoire process (évite ré-auth à chaque request)
- **Catalog `unstable_cache` 1h** : warm via cron `/api/ping` quotidien
- **Range header forward** : seek vidéo natif, pas de re-télécharge

### Performance frontend
- **Player state machine** : poster + loader + events (loadstart/canplay/playing/waiting/error)
- **Hover preload desktop** : 200ms debounce → fetch 64KB Range pour warmer Drive avant clic
- **IntersectionObserver mobile** : preload viewport 1 stream max (mutex)
- **Hero `preload="metadata"`** : évite télécharger 56MB sur arrivée page
- **InfoModal defer mount** : vidéo modal montée à 600ms (économise bandwidth)

### Observabilité
- **Logs server** : `[stream] id=… total=Xms drive=Yms metaSource=cache|drive` dans Vercel Logs
- **Perf marks client** : `track()` envoie player events vers `/api/log` via `sendBeacon`
- **Compresseur audio splash** : TUDUM Netflix-style 2 temps (Tu impact + DUM grave)

---

## UI Netflix-like (audit V2)

### Design system
- Tokens CSS centralisés dans `app/globals.css` :
  `--bg-main`, `--bg-netflix`, `--bg-elevated`, `--text-primary/secondary/muted`,
  `--accent` (#E50914), `--hover-soft`, `--overlay-dark`
- Polices : Inter (texte) + Bebas Neue (titres)

### Components clés
- **`HeaderShell`** : sticky transparent → noir + backdrop-blur dès scrollY>40px
- **`HeroResponsive`** : desktop = HeroVideoBlock puis HeroCarousel (fade 700ms à la fin vidéo)
- **`HeroCarousel`** : aspect-video 16:9 ken-burns, flèches navigation desktop, swipe mobile
- **`VideoCard`** : hover delay 200ms, scale 1.12, gradient bottom, actions ronde (Play/Plus/Info)
- **`Top10Row`** : chiffres géants Bebas rouge stroke
- **`InfoModal`** : desktop centré ; mobile bottom sheet avec drag handle (swipe down >120px ferme)
- **`BottomTabBar`** : 4 onglets (Accueil, Recherche, Ma liste, Catégories) + 5e Admin si admin
- **`MobileMenu`** : burger drawer avec scroll-lock préservant position iOS
- **`SplashIntro`** : 4s fade, son TUDUM Web Audio, à chaque visite
- **`Skeletons`** : `RowSkeleton`, `CardSkeleton`, `HeroSkeleton` avec shimmer

---

## Panneau admin `/admin`

### Accès
- Auth obligatoire + role `admin` dans le Sheet (colonne E)
- Sinon redirect vers `/`
- Lien visible : Header desktop, MobileMenu burger, BottomTabBar mobile (5e onglet)

### Actions disponibles
- **Lister** users (GET cache no-store, force refresh)
- **Ajouter** user : email + nom + rôle (user/admin) + active (toggle)
- **Mettre à jour** : email existant → update colonnes
- **Promouvoir/Rétrograder** : toggle role admin↔user
- **Désactiver** : set Actif=FALSE (préserve historique)
- **Supprimer** : clear cells de la ligne (user disparaît)

### API technique
```
GET    /api/admin/whitelist                    → { users: WhitelistEntry[] }
POST   /api/admin/whitelist                    → { ok, entry }
       body: { email, name?, role?, active? }
DELETE /api/admin/whitelist?email=…            → désactive
DELETE /api/admin/whitelist?email=…&hard=1     → supprime physiquement
```

Auth : check `session.user.role === "admin"` sur chaque endpoint.

---

## Workflow déploiement

```bash
cd C:\Users\nicol\Documents\Claude\Projects\LARAPLAY
git add -A
git commit -m "feat: …"
git push
# Vercel auto-deploy via GitHub webhook → branche main → production
```

Verif rapide :
```powershell
# Test ping (pas auth)
Invoke-WebRequest https://laraplay.vercel.app/api/ping -UseBasicParsing
```

Logs Vercel : https://vercel.com/lfiagselects-projects/laraplay/logs

---

## Limites connues

- **Drive lent** : ~1s pour 1er chunk, mur physique. Migration Bunny.net/R2 nécessaire pour <500ms.
- **Cron Hobby** : 1×/jour max. Pour vrai warmup, monitor externe (UptimeRobot 5min).
- **Pas de pipeline encodage** : si vidéo upload sans `+faststart`, démarrage plus lent. Re-encode manuel via ffmpeg si gain net.
- **Modal mobile drag** : single-axe vertical, pas de momentum scroll.

---

## Maintenance courante

| Tâche | Comment |
|---|---|
| Ajouter un user | `/admin` → form ajout |
| Désactiver un user | `/admin` → bouton Désactiver |
| Promouvoir admin | `/admin` → bouton ↑ admin |
| Voir formats vidéo | `/api/admin/formats` (JSON) |
| Mesurer perf stream | Vercel Logs filter `[stream]` |
| Re-encode vidéo | `ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4` |
| Forcer cache catalog refresh | `/api/ping` (touche `getCatalog`) |

---

## Fichiers clés

```
laraplay/
├── app/
│   ├── api/
│   │   ├── stream/[id]/route.ts       Stream proxy + logs timing
│   │   ├── thumb/[id]/route.ts        Thumb proxy
│   │   ├── video/[id]/route.ts        Metadata + similaires
│   │   ├── videos-by-ids/route.ts     Batch lookup
│   │   ├── ping/route.ts              Warmup cron
│   │   ├── log/route.ts               KPI events
│   │   └── admin/
│   │       ├── whitelist/route.ts     CRUD whitelist
│   │       └── formats/route.ts       Audit mimeTypes
│   ├── admin/page.tsx                 Page admin (server)
│   ├── login/page.tsx                 Login premium minimal
│   ├── unauthorized/page.tsx          Accès refusé
│   ├── watch/[id]/page.tsx            Lecture vidéo
│   ├── categories/page.tsx            Index catégories Bebas
│   ├── eras/page.tsx                  Index ères
│   ├── layout.tsx                     Root + BottomTabBar
│   ├── page.tsx                       Home (Splash, Hero, Rows)
│   └── globals.css                    Tokens + animations
├── components/
│   ├── Header.tsx                     Server avec lien Admin
│   ├── HeaderShell.tsx                Client scroll state
│   ├── HeroResponsive.tsx             Switch vidéo↔carousel
│   ├── HeroVideo.tsx                  Vidéo desktop avec onEnded
│   ├── HeroCarousel.tsx               Carousel + flèches desktop
│   ├── VideoCard.tsx                  Card hover refondue V2
│   ├── Player.tsx                     State machine + perf marks
│   ├── InfoModal.tsx                  Desktop modal / mobile sheet
│   ├── ModalProvider.tsx              Context modal global
│   ├── MobileMenu.tsx                 Burger drawer + admin
│   ├── BottomTabBar.tsx               Mobile tab bar + admin
│   ├── SplashIntro.tsx                TUDUM Web Audio
│   ├── Skeletons.tsx                  Shimmer placeholders
│   └── AdminClient.tsx                UI admin whitelist
├── lib/
│   ├── google.ts                      Service account (read+write Sheet)
│   ├── drive.ts                       List + get + stream + thumb
│   ├── catalog.ts                     unstable_cache + byId Map
│   ├── catalog-meta.ts                Eras + thematic rows config
│   ├── category-images.ts             Mapping noms → fallback images
│   ├── hero-videos.ts                 Config hero (vidéo + slides)
│   ├── whitelist.ts                   Read + write Sheet
│   ├── watch-progress.ts              localStorage par user
│   ├── favorites.ts                   localStorage par user
│   ├── perf.ts                        Track client perf marks
│   └── preload.ts                     Hover + Viewport hooks
├── auth.ts                            NextAuth + role JWT
├── auth.config.ts                     Config edge-safe
├── middleware.ts                      Bypass /api/auth + /api/ping
├── next.config.ts                     Config Next
├── vercel.json                        regions cdg1 + cron daily
└── public/
    ├── hero-videos/                   Vidéos hero MP4
    ├── hero-fallback/                 Images carousel mobile
    ├── categories/categories/          Vignettes catégories
    └── icons/                         PWA icons
```

---

## Prochaines pistes (si besoin futur)

- [ ] Pipeline encodage upload : ffmpeg `-movflags +faststart -crf 22 -c:v libx264 -c:a aac`
- [ ] Migration vidéo vers CDN (Bunny.net Stream ~1$/mois → TTFB <200ms)
- [ ] Skeleton sur rows pendant chargement initial home
- [ ] Player UI custom (controls overlay fade, progress bar custom)
- [ ] Service worker offline (PWA cache)
- [ ] Telemetry consolidée `/api/metrics` (agrège logs)
- [ ] Modal admin avec stats par user (vues, durée totale)
- [ ] Internationalisation (en/fr)

---

## Contact & support

Code source : github.com/lfiagselect/laraplay
Vercel : vercel.com/lfiagselects-projects/laraplay

Document généré : 2026-05-02
