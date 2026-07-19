# Étude de migration LARAPLAY vers OVH avec refonte possible de l'authentification

> Étude uniquement. Aucune modification de code, aucun déploiement, aucune action OVH/DNS, aucune création de base, aucun changement de variable d'environnement.
> Cadre : plugin *General Cowork Lite Precision*, logique `/delta` (périmètre limité, lecture ciblée). Date : 2026-07-08.
> Base factuelle : lecture du code réel du dépôt LARAPLAY (voir §2). Les points non vérifiables dans le code sont marqués **[hypothèse]**, **[à vérifier]**, **[risque]** ou **[non confirmé]**.

---

## 1. Résumé exécutif

**La question posée repose sur une prémisse partiellement fausse.** Le code réel montre que LARAPLAY ne stocke plus ses vidéos sur Google Drive : la source de vérité du catalogue et le streaming passent par **Bunny Stream (CDN)**. Google n'est plus utilisé que pour deux choses : (1) l'**identité** (OAuth Google via NextAuth) et (2) le **stockage des droits** (whitelist + device flow TV) dans un **Google Sheet** utilisé comme base de données. Le proxy Drive (`/api/stream/[id]`) n'est plus qu'un **fallback legacy**.

Conséquences directes pour l'étude :

- **« Ne plus utiliser Google »** = remplacer OAuth + remplacer le Sheet-base-de-données. C'est **faisable et raisonnable** avec une base SQL OVH + NextAuth. Cela n'a **aucun lien** avec le stockage vidéo.
- **Migration de l'hébergement applicatif vers OVH** = faisable, mais Next.js 16 en SSR exige un **runtime Node persistant**. Ton offre OVH actuelle (**Web Hosting Pro mutualisé, PHP 8.2/MySQL, ≈ 23,88 €/an** — confirmée via le dossier SNE) **ne peut pas** l'exécuter : pas de Node, egress restreint. Héberger l'app chez OVH imposerait donc de **souscrire un produit distinct** (VPS ou Public Cloud), avec la charge d'exploitation (build, PM2/systemd, reverse proxy, TLS, mises à jour, supervision) aujourd'hui absorbée par Vercel.
- **Migration des médias vers OVH** (Object Storage/CDN) = **déconseillée**. On perdrait le transcodage, le HLS adaptatif et le CDN global de Bunny, pour un usage privé qui n'en a pas besoin. Faible bénéfice, fort risque.

**Recommandation synthétique.** Découpler les deux axes. Axe hébergement : rester sur Vercel **ou** migrer vers un VPS OVH uniquement si l'objectif est la maîtrise/coût, en connaissance de la dette d'exploitation. Axe auth : remplacer le Google Sheet par une **base SQL managée OVH** en gardant d'abord Google OAuth comme fournisseur d'identité (**Option Auth B**), puis, seulement si le besoin « zéro Google » est réel, ajouter progressivement un login interne (magic link ou code d'accès). Bunny reste inchangé.

**Décision recommandée (voir §16) : migration partielle et progressive**, pas de « big bang ».

---

## 2. État actuel vérifié

Vérifié par lecture directe des fichiers (chemins réels du dépôt).

### 2.1 Stack (confirmé — `package.json`)

- Next.js **16.2.4**, React **19.2.4**, NextAuth **v5.0.0-beta.31**, Tailwind **4**, `googleapis` **^171**, `hls.js` **^1.5**.
- Scripts : `next dev` / `next build` / `next start` / `tsc --noEmit`.
- **[risque]** NextAuth v5 est en **beta** : API non stabilisée, à figer avant toute refonte auth.

### 2.2 Runtime & rendu (confirmé)

- **Toutes** les routes API déclarent `export const runtime = "nodejs"` (stream, video, admin, device, webhook, log, refresh-catalog…). Aucune route Edge critique. → un **runtime Node est obligatoire**.
- Mélange `force-dynamic` (routes dynamiques/SSR) et `revalidate = 3600` (ISR sur pages catalogue : `/`, `/category/[slug]`, `/watch/[id]`, `/search`, `/eras`, `/categories`). → besoin d'un serveur qui gère **SSR + ISR**, pas d'un simple hébergement statique.
- Middleware = `proxy.ts` (convention Next 16, ex-`middleware.ts`), basé sur `authConfig` allégé (sans `googleapis`), redirige vers `/login` (ou `/login-basic` si User-Agent TV).

### 2.3 Streaming & médias (confirmé — contredit la doc)

- `lib/catalog.ts` : *« source : Bunny Stream API »*, importe `listAllVideos` depuis `lib/bunny.ts`. **Bunny est la source de vérité du catalogue.**
- `lib/bunny.ts` : *« Bunny Stream API (source de vérité unique) »*.
- `app/watch/[id]/page.tsx` : lecture via `bunnyStreamUrl(video.bunnyId, "play_720p.mp4")` (URL **CDN Bunny signée**) ; `/api/stream/[id]` (proxy Drive) n'est utilisé **que si `bunnyId` est absent** → **fallback legacy**.
- `lib/bunny-sign.ts` : signature **CDN Token Authentication** (SHA256 `key+path+expires`, base64url, TTL 4 h). **Si `BUNNY_SECURITY_KEY` absente → URL non signée servie** (mode « DEV/transition »).
- Le proxy Drive (`/api/stream/[id]`, `lib/drive.fetchDriveStream`) existe encore, supporte les Range requests, garde le token OAuth côté serveur. Fonctionnel mais **hors chemin nominal**.

### 2.4 Authentification (confirmé)

- **Identité** : Google OAuth via NextAuth (`auth.config.ts`, provider Google). Sessions **JWT** (`session.strategy = "jwt"`), pas de sessions en base.
- **Autorisation** : whitelist dans **Google Sheet** (`lib/whitelist.ts`, onglet `Autorisés`, colonnes Email/Nom/Actif/Date/Role, cache 5 min). Rôles `admin`/`user`, statut `active`. CRUD admin via `/api/admin/whitelist` (protégé `role === "admin"`).
- **TV** : Device Flow type RFC 8628 (`lib/device-flow.ts`), **stocké dans un Google Sheet** (onglet `DeviceFlow`). Provider NextAuth `Credentials` id `device` dans `auth.ts`. Route `/login-basic` (HTML pur, `runtime=nodejs`) pour TV sans clavier/souris.
- `callbacks.signIn` : revérifie la whitelist à chaque login ; `jwt`/`session` injectent `role`.

### 2.5 Déploiement (confirmé + écarts)

- `vercel.json` présent : région **`cdg1`** (Paris), **cron quotidien** `/api/ping` (0 4 * * *). CLAUDE.md indique Vercel.
- **[écart]** Commentaires « Netlify » dans `catalog.ts` et `device-flow.ts` : **traces obsolètes**, contredites par `vercel.json`. Déploiement réel = **Vercel** (sous réserve confirmation compte **[à vérifier]**).

### 2.6 Variables d'environnement attendues (noms uniquement — aucune valeur affichée)

Référencées dans le code : `BUNNY_API_KEY`, `BUNNY_LIBRARY_ID`, `BUNNY_SECURITY_KEY`, `BUNNY_WEBHOOK_SECRET`, `NEXT_PUBLIC_BUNNY_PULL_ZONE`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON` (ou `GOOGLE_APPLICATION_CREDENTIALS` en dev), `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_TAB`, `GOOGLE_SHEET_DEVICEFLOW_TAB`, `GOOGLE_DRIVE_FOLDER_ID`, `NEXTAUTH_URL`, `REVALIDATE_SECRET`.
Présentes dans `.env.local` (noms seuls) : `AUTH_SECRET`, `NEXT_PUBLIC_BUNNY_LIBRARY_ID`, + variables Bunny/Google/NextAuth ci-dessus.

**[risque] Deux gaps de configuration détectés :**
1. `BUNNY_SECURITY_KEY` et `BUNNY_WEBHOOK_SECRET` sont **référencés dans le code mais absents de `.env.local`**. Si non définis en prod → **URLs Bunny non signées** (hotlinking possible, contournement whitelist) et **webhook Bunny non authentifié**. **[à vérifier en prod, priorité sécurité]**.
2. Le README documente `NEXTAUTH_SECRET` alors que le code v5 utilise `AUTH_SECRET` (présent dans `.env.local`). Écart documentaire, non bloquant.

---

## 3. Contraintes techniques non négociables

Toute cible d'hébergement doit garantir, faute de quoi la migration régresse :

1. **Runtime Node.js persistant** (Node 20+ recommandé pour Next 16) — pas de FaaS court, pas de PHP, pas de statique seul.
2. **`next build` + `next start`** (ou mode `standalone`) avec support **SSR + ISR** (revalidation à chaud des pages catalogue).
3. **HTTPS obligatoire** (cookies de session sécurisés, OAuth callback, CDN token).
4. **Variables d'environnement serveur** injectées de façon sûre (jamais côté client sauf `NEXT_PUBLIC_*`).
5. **Secret NextAuth** stable (`AUTH_SECRET`) et `NEXTAUTH_URL` cohérent avec le domaine.
6. **Confidentialité vidéo préservée** : aucune URL Drive/Bunny exploitable sans session ; signature CDN active.
7. **Compatibilité auth** : provider Google + provider `device` (ou leurs remplaçants) fonctionnels derrière le middleware.
8. **Support TV** : route `/login-basic` HTML pur + device flow doivent survivre (multi-instances, cold start).
9. **Persistance des droits** : la « base » (aujourd'hui Sheet) doit rester cohérente en multi-instances.
10. **Cron** `/api/ping` (keep-alive catalogue) ou équivalent.

---

## 4. Scénarios d'hébergement OVH

> **Compte OVH — CONFIRMÉ** (lecture du dossier « SITE INTRA SNE », facture OVH n° 251934009 et `CLAUDE.md` SNE). L'offre est **OVH Web Hosting Pro mutualisé** : cluster `inlasca.cluster100.hosting.ovh.net`, domaine `inlasco.fr`, **≈ 23,88 €/an HT**, 250 Go SSD, **PHP 8.2**, **MySQL/MariaDB** (bases type `*.mysql.db`, port 3306), **SSH/SFTP inclus**, **cron manager** (granularité minute non réglable), **pas d'IP sortante fixe**. Toutes les apps SNE (Mes Frais, Studio, Hub, Trombinoscope) sont **PHP/MySQL**.
>
> **Conséquence directe et non négociable : cette offre ne peut PAS exécuter LARAPLAY.** C'est du mutualisé **PHP sans runtime Node.js** — donc aucun `next start`/SSR possible. Héberger l'app LARAPLAY chez OVH impose d'**acheter un produit distinct** (VPS ou Public Cloud) ; ce n'est **pas** une réutilisation de l'hébergement existant.
>
> **[risque majeur — à vérifier] Egress bloqué.** Le `CLAUDE.md` SNE documente que l'**OVH mutualisé bloque l'egress vers Cloudflare** (« OVH ne peut PAS appeler Mistral, ni Render, ni OpenAI/Anthropic ; **Google passe** »). Or l'API Bunny (`video.bunnycdn.com`) est probablement fronted CDN. Si un composant devait tourner sur ce mutualisé et appeler Bunny côté serveur → **risque d'échec du catalogue**. Cela **ne concerne pas** un VPS/Public Cloud (egress ouvert). Point à confirmer si l'on envisageait quoi que ce soit sur le mutualisé.
>
> **Actif réutilisable** : le compte inclut déjà **MySQL mutualisé** (voir §6, option « réutiliser la base OVH existante ») et une **implémentation d'auth interne éprouvée** (Hub SNE : Argon2id + poivre serveur, sessions durcies, CSRF, verrouillage 5 échecs/15 min, audit) qui sert de **blueprint** pour l'Option Auth C/E (voir §5, §7).

### Scénario A — Ne rien migrer (rester Vercel)
- **Avantages** : zéro effort, build/SSR/ISR/HTTPS/cron/CDN edge gérés, région Paris déjà configurée, rollback trivial (redeploy).
- **Inconvénients** : dépendance Vercel, coût variable selon usage/bande passante **[à vérifier tarif réel]**, moins de maîtrise bas niveau.
- **Sécurité/perf** : bonnes par défaut. **Intérêt de ne rien changer : élevé** si la motivation est uniquement technique ; faible si l'objectif est la souveraineté/maîtrise chez OVH.

### Scénario B — OVH pour domaine / DNS uniquement
- **Intérêt** : consolider le domaine chez OVH, pointer vers Vercel (CNAME/A) ou un futur VPS. Aucun changement applicatif.
- **Limites/risques** : ne répond pas à « migrer l'hébergement » ; simple préparation. Attention TTL DNS et cohérence `NEXTAUTH_URL` si le domaine change.
- **Actions** : gérer la zone DNS OVH, configurer l'enregistrement vers la cible, TLS géré par la cible.

### Scénario C — VPS OVH pour héberger l'app Next.js *(cible OVH réaliste)*
- **Faisabilité** : **oui**. Un VPS OVH (à partir de ~**5–9 €/mois** selon palier 2026 **[à vérifier config exacte]**) fait tourner Next 16 en Node.
- **Architecture cible** : Node 20+ → `next build` (idéalement `output: "standalone"`) → lancement `next start` sous **PM2 ou service systemd** → **reverse proxy Nginx/Caddy** en frontal → **TLS Let's Encrypt** (Caddy automatique, ou Certbot).
- **À la charge de l'exploitant** : provisioning, hardening SSH (clé, fail2ban), **firewall** (UFW/OVH), variables d'env (fichier `.env` hors web-root, permissions strictes), **logs** (journald/logrotate), **sauvegarde** (snapshot VPS + `.env`), **supervision** (uptime, cron `/api/ping`), **mises à jour système + renouvellement TLS**.
- **Effort initial estimé** : **6–12 h** de configuration **[source communauté, ordre de grandeur]**, puis maintenance récurrente.
- **Verdict** : bonne option si maîtrise/coût prime ; **[risque]** transfère l'exploitation à toi.

### Scénario D — VPS OVH (app + base SQL) + vidéos restant sur Bunny *(recommandé si migration OVH)*
- **Faisabilité** : **oui, la plus cohérente**. L'app et la base des droits vont chez OVH ; les **vidéos restent sur Bunny** (transcodage, HLS, CDN, signature conservés).
- **Base** : soit **Managed Database OVH** (PostgreSQL/MySQL, réseau privé vRack, sauvegardes incluses), soit PostgreSQL/MySQL **auto-hébergé sur le VPS** (plus simple mais sauvegardes/sécurité à ta charge).
- **Permet** de supprimer le Google Sheet, et **optionnellement** Google OAuth (voir §5).
- **Impacts** : +1 dépendance (base) mais -1 dépendance (Sheet). Perf ≈ Vercel si VPS bien dimensionné et proche (région Gravelines/Roubaix). **Intérêt : élevé.**

### Scénario E — OVH pour app + base + **stockage média** (Object Storage/CDN OVH)
- **Faisabilité technique** : possible mais **lourde**. Il faudrait migrer toutes les vidéos vers **OVH Object Storage (S3-compatible)** + un **CDN** + **re-signer** les URLs + gérer soi-même le **transcodage/HLS adaptatif** (que Bunny fournit nativement).
- **Coûts** : stockage + **bande passante sortante** (le streaming vidéo est gourmand) — potentiellement **plus cher et moins performant** que Bunny pour un usage privé **[à vérifier chiffrage]**.
- **Risques** : perte du player adaptatif, re-encodage massif, migration longue, rollback complexe.
- **Verdict** : **déconseillé**. Peu pertinent pour un usage privé restreint.

### Scénario F — Architecture hybride recommandée
- **Reste chez Bunny** : hébergement + streaming des vidéos (inchangé).
- **Reste chez Google (au moins en phase 1)** : OAuth identité — ou remplacé plus tard.
- **Va chez OVH** : hébergement de l'app Next.js (VPS) + **base SQL** des droits/device flow (remplace le Sheet).
- **Justification** : bénéfice maximal (sortir du Sheet-comme-DB, maîtrise app) pour risque minimal (on ne touche ni au streaming ni, au début, à l'identité). Étapes en §13.

---

## 5. Scénarios d'authentification

Rappel : aujourd'hui = Google OAuth (identité, JWT) + Sheet (droits) + device flow (Sheet).

### Option Auth A — Conserver Google OAuth + Google Sheet *(statu quo)*
- **+** : simplicité maximale, zéro mot de passe à gérer, code déjà en place, whitelist éditable à la main, effet immédiat.
- **−** : dépendance Google (OAuth **et** Sheet-as-DB), utilisateurs **sans compte Google exclus**, Sheet peu robuste (quotas API Sheets, latence, pas de transactions), device flow qui écrit dans un tableur **[risque de contention]**.
- **Compatibilité TV** : OK (device flow existant). **Impact OVH** : nul (indépendant de l'hébergement).

### Option Auth B — Google OAuth (identité) + **base OVH** pour les droits *(recommandée en cible)*
- Google **reste fournisseur d'identité** ; la base SQL **remplace le Sheet**.
- Tables : `users(email PK, name, role, active, created_at)`, éventuellement `device_codes` (voir §6).
- **+** : robustesse (transactions, index, requêtes), interface admin conservée (réécrite sur SQL), audit possible, complexité **raisonnable**, migration des utilisateurs = **import du Sheet → table `users`** (one-shot).
- **−** : +1 base à opérer. **TV** : device flow migré vers la table `device_codes` (plus fiable que le Sheet). **Impact code** : `lib/whitelist.ts` et `lib/device-flow.ts` réécrits sur SQL ; `auth.ts` inchangé sur le principe (Google + Credentials `device`).

### Option Auth C — Email / mot de passe + base OVH
- Suppression de Google OAuth. Table `users` avec **hash de mot de passe**.
- **Hash** : **Argon2id** recommandé (sinon **bcrypt** coût ≥ 12 si contrainte de dépendance). **Jamais en clair, jamais de hash faible (MD5/SHA1 nu).**
- Nécessite : politique de mot de passe, **reset** (donc envoi email → dépendance SMTP), **anti-brute-force / rate limiting**, vérification email, stockage sessions (JWT conservable).
- Via **NextAuth Credentials provider** (déjà utilisé pour `device`, donc pattern connu).
- **−** : **surface de sécurité fortement accrue** (c'est toi qui deviens responsable des mots de passe), charge de maintenance élevée. **[risque]** Pour un usage privé familial/restreint, rapport bénéfice/risque **défavorable**.
- **TV** : saisie d'un mot de passe au clavier TV = **mauvaise UX** → device flow reste nécessaire en parallèle.

### Option Auth D — Magic link email
- Login sans mot de passe : l'utilisateur reçoit un lien à usage unique (token temporaire en base, TTL court 10–15 min).
- **+** : pas de mot de passe à stocker, UX simple, s'appuie sur l'email (souvent déjà l'identifiant whitelist).
- **−** : **dépendance SMTP** (fournisseur email transactionnel, coût/délivrabilité **[à vérifier]**), abus possibles (rate limiting requis), latence de réception.
- **NextAuth** : adapter Email/magic-link **exige un adapter de base de données** (table `verification_tokens`). **TV** : peu pratique (ouvrir sa boîte mail sur TV) → device flow conservé.

### Option Auth E — Codes d'accès / device flow interne
- Généralisation du device flow **déjà présent** : code temporaire affiché, validé depuis un autre appareil déjà authentifié, stocké en base (`device_codes`), avec expiration.
- **+** : **excellent pour TV**, cohérent avec un usage familial/restreint, permet de **supprimer Google** si couplé à un premier facteur (ex. magic link sur mobile pour approuver).
- **−** : il faut un « approbateur » déjà authentifié ; définir le premier point d'entrée d'identité. Sécurité correcte si codes courts-vécus + throttling (déjà implémenté : intervalle 4 s, expiration 10 min).

### Option Auth F — Hybride temporaire *(chemin de transition sûr)*
- Garder Google OAuth **pendant la transition**, ajouter l'auth interne en parallèle, migrer les utilisateurs par vagues, **rollback facile** (désactiver le provider interne).
- **−** : **[risque]** double chemin d'auth = complexité et double surface à sécuriser tant que la bascule n'est pas finie ; à **borner dans le temps**.

**Synthèse auth** : privilégier **B** (robuste, faible risque). Si « zéro Google » est un objectif ferme → **B puis F puis E+D** (device flow pour TV + magic link pour mobile), en évitant **C** (mots de passe) sauf besoin explicite.

**Blueprint disponible dans ton écosystème** : le **Hub SNE** (`Hub/sne-hub/`) implémente déjà, en PHP/MySQL, exactement le socle d'une auth interne sûre — **Argon2id + poivre serveur** (config hors webroot, `chmod 600`, poivre irremplaçable), **sessions durcies** (cookie dédié, idle 30 min), **CSRF**, **verrouillage 5 échecs/15 min**, **audit log**, comptes créés par admin + MDP temporaire à changement forcé (≥ 12 caractères). Ce n'est pas du code réutilisable tel quel (LARAPLAY = Node/NextAuth, pas PHP), mais c'est un **modèle validé en production** dont l'Option C/E peut s'inspirer directement (mêmes garde-fous, transposés en NextAuth Credentials + Argon2id). Cela **réduit le risque** de l'auth interne, car les décisions de sécurité sont déjà éprouvées côté SNE.

---

## 6. Scénarios base de données OVH

### Options (selon ce que le compte OVH permet — **[à vérifier]**)

| Option | Compatibilité Next.js | Persistance | Sauvegarde | Sécurité réseau | Maintenance | Coût indicatif | Verdict |
|---|---|---|---|---|---|---|---|
| **Managed PostgreSQL OVH** (Public Cloud DB) | Excellente (Prisma/Drizzle) | Managée | **Incluse** | vRack/IP allow-list, TLS | **Faible** (OVH gère) | Facturation horaire/mensuelle **[à vérifier]** | **Recommandé** |
| **Managed MySQL OVH** | Excellente | Managée | Incluse | idem | Faible | idem | Bon (2ᵉ choix) |
| **MySQL mutualisé OVH — DÉJÀ dans le compte** (`*.mysql.db`) | Correcte (Prisma/Drizzle MySQL) mais accès distant à confirmer | Oui | Sauvegarde OVH mutualisé | Restreinte, **[à vérifier] accès distant** depuis Vercel/VPS | Faible (OVH gère) | **≈ inclus** (déjà payé) | **Option la moins chère** si accès distant OK |
| **PostgreSQL/MySQL auto-hébergé sur le VPS** | Excellente | Oui | **À ta charge** | localhost (pas d'exposition) | **Élevée** (patchs, backups) | Inclus dans le VPS | Acceptable si backups sérieux |
| **SQLite (fichier sur VPS)** | Bonne en mono-instance | Fichier local | Copie de fichier | N/A (local) | Faible | Nul | OK **seulement** si **1 seule instance** ; **[risque]** casse en multi-instance/serverless |
| **Docker + base séparée** | Bonne | Volume | À ta charge | Réseau interne | Élevée | VPS | Overkill pour cet usage |

**Recommandation base** (révisée avec le contexte OVH confirmé) :
- **Chemin le moins cher** : réutiliser la **base MySQL mutualisée déjà présente** dans le compte (comme le font Mes Frais/Studio/Hub SNE) pour la seule table `users` (+ `device_codes`) — **à condition de vérifier que l'accès distant** (depuis Vercel ou un VPS) est autorisé par OVH sur le mutualisé. **[à vérifier — probablement restreint]** : le mutualisé OVH n'autorise pas toujours les connexions externes fiables ; historiquement `*.mysql.db` est surtout joignable **depuis l'hébergement OVH lui-même**. Si l'app reste sur Vercel, la connexion Vercel→MySQL mutualisé OVH est **le point à valider en priorité**.
- **Chemin le plus robuste** : **Managed PostgreSQL/MySQL OVH (Public Cloud)** — accès restreint (IP allow-list/vRack), sauvegardes/patchs délégués. Produit **à souscrire** (coût supplémentaire).
- **Si VPS** : PostgreSQL/MySQL en `localhost` sur le VPS, sauvegardes automatisées.
- **SQLite** : uniquement mono-instance VPS ; **incompatible Vercel serverless**.

### Schéma minimal proposé (aucune migration créée, illustratif)

- `users` : `id`, `email` (unique), `name`, `role` (`admin`/`user`), `active` (bool), `created_at`. *(remplace le Sheet whitelist)*
- `device_codes` : `device_code`, `user_code`, `email`, `status` (`pending`/`approved`/`expired`/`denied`), `created_at`, `expires_at`, `last_poll_at`. *(remplace l'onglet DeviceFlow)*
- `accounts` + `sessions` + `verification_tokens` : **uniquement si** adoption d'un **NextAuth adapter** (magic link Option D, ou sessions en base au lieu de JWT).
- `watch_progress` (`email`, `video_id`, `position`, `updated_at`) et `favorites` (`email`, `video_id`) : **optionnels**, seulement si migration du `localStorage` actuel (`lib/watch-progress.ts`, `lib/favorites.ts`) vers le serveur est souhaitée (améliore le cross-device, non requis).
- `audit_logs` : **optionnel et minimal** (qui/quoi/quand sur actions admin) — utile RGPD/sécurité, à limiter dans le temps.

**Interdits maintenus** : pas de création de base ici, pas de migration exécutée, aucun secret généré.

---

## 7. NextAuth — bon outil ?

- **Oui, NextAuth v5 reste adapté** : il gère nativement Google OAuth (déjà en place), Credentials (device flow déjà en place), et — via un **adapter SQL** (Drizzle/Prisma/Kysely) — magic link, sessions en base et rôles.
- **Sessions** : rester en **JWT** (léger, sans table) tant qu'on ne fait pas de révocation immédiate ; passer en **sessions base** seulement si besoin de révocation/traçabilité fine.
- **Comparaison** :
  - *Conserver NextAuth (Google + JWT)* → statu quo, minimal.
  - *NextAuth + adapter SQL OVH* → **recommandé** pour sortir du Sheet tout en gardant le cadre éprouvé.
  - *Remplacer par une solution custom* → **déconseillé** (réinvente la sécurité).
  - *Lucia / autre* → possible mais **[risque]** l'écosystème Lucia a évolué/été déprécié selon versions **[à vérifier]** ; pas de gain vs NextAuth ici.
- **Recommandation** : **garder NextAuth**, ajouter un **adapter SQL**, conserver Google en phase 1. Robuste et maintenable avant sophistiqué.

---

## 8. Analyse sécurité

Points vérifiés et à surveiller :

- **URLs vidéo** : Bunny signé (token 4 h) **si `BUNNY_SECURITY_KEY` définie**. **[risque prioritaire — à vérifier]** : clé absente de `.env.local` → risque d'URLs nues (hotlinking, bypass whitelist). À confirmer en prod et activer la Token Authentication Bunny.
- **Webhook Bunny** : `BUNNY_WEBHOOK_SECRET` référencé mais absent de `.env.local` → **[risque] webhook potentiellement non authentifié**. À vérifier.
- **Routes stream/API** : protégées par `auth()` (401 si pas de session) + middleware `proxy.ts`. Admin protégé par `role === "admin"`. Cohérent.
- **Secrets** : service account Google et clés Bunny côté serveur uniquement ; seuls `NEXT_PUBLIC_*` (pull zone, library id) sont exposés — **normal** (protégés par la signature). Ne jamais exposer `AUTH_SECRET`, clés Bunny privées, JSON service account.
- **Si migration VPS** : `.env` hors web-root, permissions `600`, pas de secret dans l'image/Git, **rotation** possible des secrets, **firewall** fermé sauf 80/443 (+ SSH restreint), base **non exposée publiquement** (localhost ou vRack/IP allow-list).
- **Si auth interne (C/D)** : hash **Argon2id/bcrypt**, **rate limiting** (login, magic link, reset), tokens à usage unique + TTL court, cookies `Secure`/`HttpOnly`/`SameSite`, HTTPS strict, `AUTH_SECRET` stable, `NEXTAUTH_URL` = domaine réel.
- **RGPD minimal** : données stockées = emails + noms + rôles (+ progression/favoris si migrés). Finalité = contrôle d'accès. **Prévoir** : durée de conservation, procédure de suppression (droit à l'effacement), journalisation minimale, information des utilisateurs. Passer d'un Sheet Google (hors UE possible) à une base **OVH (UE)** **améliore** la posture RGPD **[à confirmer selon localisation datacenter]**.

**Contraintes à ne jamais violer** (rappel) : pas d'URL Drive/Bunny publique exploitable, pas de mot de passe en clair, pas de secret côté client, pas de route admin sans contrôle fort, base jamais publique sans restriction.

---

## 9. Analyse performance / streaming

- **Streaming** : porté par **Bunny CDN** (adaptatif, edge global), **indépendant de l'hébergeur app**. Migrer l'app vers OVH **ne dégrade pas** le streaming tant que Bunny reste. C'est l'atout majeur : le trafic vidéo lourd **ne transite pas** par le serveur applicatif.
- **Proxy Drive** (`/api/stream/[id]`) : uniquement fallback ; sur VPS il consommerait bande passante/CPU du VPS **[risque]** si beaucoup de vidéos sans `bunnyId`. À auditer avant bascule (vérifier qu'aucune vidéo active n'est sans `bunnyId`).
- **SSR/ISR** : Vercel fournit un edge/cache global ; un VPS unique en région Paris/Gravelines donne de **bonnes** perfs pour un public FR/UE, moins bonnes hors UE **[selon audience]**. ISR (`revalidate=3600`) fonctionne sur `next start`.
- **Cron** `/api/ping` : à reporter (cron système OVH/systemd timer) si sortie de Vercel.

---

## 10. Analyse coûts / maintenance

> Chiffres = **ordres de grandeur publics 2026, à vérifier** selon config/compte. Aucun montant inventé pour ton compte.

- **Vercel (statu quo)** : coût variable selon plan/usage (bande passante applicative, pas la vidéo qui est chez Bunny). Maintenance **quasi nulle**.
- **VPS OVH** : à partir de ~**5–9 €/mois** (palier 2026) ; VPS-2 ≈ **8,49 €/mois**, VPS-3 ≈ **16,99 €/mois** **[à vérifier config]**. Maintenance **élevée** (système, TLS, backups, supervision).
- **Managed Database OVH** : facturation horaire/mensuelle, sauvegardes/IOPS inclus **[à vérifier tarif]**. Maintenance **faible** (déléguée).
- **Bunny** : inchangé (stockage + bande passante streaming).
- **Bilan** : migrer vers OVH peut réduire le coût d'hébergement **mais augmente le coût-temps** (exploitation). Pour un usage privé, le **coût réel n'est pas le loyer serveur, c'est ta maintenance**.

---

## 11. Recommandation principale

**Migration partielle et progressive, sans big bang** (= Scénario hébergement **D/F** + Auth **B**) :

1. **Médias** : **rester sur Bunny** (aucune migration). Activer/valider la **signature CDN** (`BUNNY_SECURITY_KEY`) et le **secret webhook**.
2. **Base des droits** : provisionner une **base SQL OVH (PostgreSQL managé)** et **migrer le Google Sheet → table `users`** (+ `device_codes`). Réécrire `lib/whitelist.ts` et `lib/device-flow.ts` sur SQL. **Cela supprime la dépendance Sheet.**
3. **Identité** : **garder Google OAuth** en phase 1 (moindre risque). Décider ensuite, séparément, si l'on retire Google (via magic link + device flow, Option D+E).
4. **Hébergement app** : **décision indépendante**. Rester sur Vercel est légitime ; migrer vers un **VPS OVH** seulement si maîtrise/coût/souveraineté le justifient, en acceptant la dette d'exploitation.

Cette approche sort du point le plus fragile (**le Sheet utilisé comme base**) sans toucher au streaming ni casser l'auth.

---

## 12. Recommandation alternative

**Si l'objectif politique est « tout OVH, zéro Google, un seul fournisseur »** :

- Hébergement **VPS OVH** (Scénario C/D) + **Managed PostgreSQL OVH**.
- Auth : **F** (hybride borné) → bascule vers **E (device flow TV) + D (magic link mobile)**, suppression finale de Google OAuth.
- Médias : **rester sur Bunny** malgré tout (migrer vers Object Storage OVH = Scénario E, **déconseillé**).
- **[risque]** Effort et surface de sécurité nettement supérieurs ; ne se justifie que par une exigence de souveraineté forte, pas par la technique.

---

## 13. Plan de migration prudent (étape par étape)

> Aucune de ces étapes n'est exécutée ici. Chaque étape = validable/rollback-able.

1. **Geler l'état** : confirmer prod réelle (Vercel ? **[à vérifier]**), inventorier les variables d'env (noms), tagger un commit de référence.
2. **Colmater sécurité d'abord** : vérifier/activer `BUNNY_SECURITY_KEY` + `BUNNY_WEBHOOK_SECRET` (indépendant de toute migration).
3. **Décider hébergement** (Vercel vs VPS OVH) — décision séparée, non bloquante pour l'auth.
4. **Provisionner la base OVH** (hors prod) : PostgreSQL managé, accès restreint (vRack/IP), TLS. *(action OVH — hors périmètre de cette étude)*
5. **Concevoir le schéma** `users` + `device_codes` (validation avant toute migration).
6. **Migrer les données** : export Sheet → import table `users` (script one-shot, réversible, Sheet conservé en lecture le temps de la bascule).
7. **Réécrire l'accès données** : `lib/whitelist.ts` et `lib/device-flow.ts` sur SQL, derrière la **même interface** (`isAuthorized`, `getByDeviceCode`, etc.) pour limiter l'impact sur `auth.ts`.
8. **Adapter env** : ajouter `DATABASE_URL` (nom), retirer à terme `GOOGLE_SHEET_*`. `auth.ts` inchangé en phase 1 (Google conservé).
9. **Recette en staging** (voir §14) avant toute bascule prod.
10. **Bascule progressive** : feature flag ou déploiement staging→prod, Sheet gardé en secours.
11. **(Optionnel) Sortie de Google** : ajouter magic link/device flow, migrer par vagues, puis retirer le provider Google.
12. **(Optionnel) Migration hébergement** : si VPS, préparer image (build standalone, PM2/systemd, Nginx/Caddy, TLS, firewall, cron), tester, basculer DNS en dernier.

**Fichiers concernés si migration décidée** (liste, non modifiés ici) :
`lib/whitelist.ts`, `lib/device-flow.ts`, `lib/google.ts` (si Sheets retiré), `auth.ts`/`auth.config.ts` (si retrait de Google ou ajout adapter), `app/api/admin/whitelist/route.ts`, `app/api/auth/device/*`, `app/login-basic/route.ts`, `.env*` (noms de variables), `README.md`/`CLAUDE.md`/`AGENTS.md` (mise à jour doc Bunny/OVH), `vercel.json` (si sortie de Vercel), + ajout d'une couche d'accès base (`lib/db.ts` + schéma).

**Variables d'environnement à prévoir** (noms uniquement, jamais de valeurs) : `DATABASE_URL` (nouvelle), conserver `AUTH_SECRET`, `NEXTAUTH_URL`, variables Bunny ; retirer à terme `GOOGLE_SHEET_ID`/`GOOGLE_SHEET_TAB`/`GOOGLE_SHEET_DEVICEFLOW_TAB` (et `GOOGLE_CLIENT_ID`/`SECRET` seulement si Google OAuth supprimé) ; `GOOGLE_DRIVE_FOLDER_ID` supprimable si le fallback Drive est retiré **[à vérifier qu'aucune vidéo n'en dépend]**. Ajouter éventuellement `SMTP_*` (magic link) et `BUNNY_SECURITY_KEY`/`BUNNY_WEBHOOK_SECRET` si absents.

**Impacts DNS / domaine / HTTPS** : nuls tant qu'on reste sur Vercel. Si VPS : créer/basculer l'enregistrement DNS vers l'IP OVH **en dernier**, TLS Let's Encrypt (Caddy/Certbot), mettre `NEXTAUTH_URL` = domaine cible, mettre à jour les **URI de redirection OAuth Google** (console Google) si le domaine change.

**Impacts OAuth si Google conservé** : mettre à jour Authorized redirect URIs / origins Google si domaine change ; sinon aucun. **Impacts si Google supprimé** : retirer le provider Google de `auth.config.ts`, prévoir un chemin d'identité de remplacement (magic link/device flow), gérer la transition des utilisateurs et la révocation.

---

## 14. Plan de test

- **Auth** : login Google OK/refusé selon whitelist SQL ; rôle `admin` vs `user` ; utilisateur `active=false` bloqué ; session JWT valide ; middleware protège toutes les routes sauf publiques.
- **TV / device flow** : `start` → `poll` (throttle 4 s) → `verify`/approve depuis un autre appareil → `finalize` ; expiration à 10 min ; `/login-basic` accessible en UA TV ; multi-instances cohérent (base, plus Sheet).
- **Streaming** : lecture Bunny signée (URL expire) ; refus sans session (401) ; fallback Drive pour une vidéo sans `bunnyId` **[si encore utilisé]** ; Range/seek OK.
- **Admin** : CRUD `users` (add/update/deactivate/remove) répercuté immédiatement ; accès interdit à un non-admin (403).
- **Perf/ISR** : pages catalogue régénérées (`revalidate=3600`) ; cron/keep-alive équivalent au `/api/ping`.
- **Sécurité** : secrets absents du client ; base injoignable depuis Internet ; signature Bunny active ; webhook authentifié ; `typecheck` + `lint` verts.
- **Non-régression** : parcours desktop / mobile / TV complet en **staging** avant prod.

## 15. Plan de rollback

- **Base/auth** : conserver le **Google Sheet en lecture** pendant N jours ; garder l'ancien code d'accès Sheet derrière un flag → retour possible en re-basculant le flag et les variables d'env, sans perte (le Sheet reste la source jusqu'à validation).
- **Hébergement** : si VPS, garder le déploiement **Vercel actif** jusqu'à validation ; rollback = **repointer le DNS** vers Vercel (prévoir TTL court avant bascule). Snapshot VPS avant chaque changement.
- **Sortie de Google** : garder le provider Google désactivable (réactivation immédiate) tant que l'auth interne n'est pas éprouvée.
- **Principe** : aucune étape irréversible sans sauvegarde préalable ni double-run (ancien + nouveau) pendant la fenêtre de bascule.

---

## 16. Conclusion

**Décision recommandée : MIGRER PARTIELLEMENT, progressivement — pas de migration « en l'état », pas de big bang.**

- **Migrer maintenant** (fort bénéfice / faible risque) : la **whitelist Google Sheet → base SQL OVH** (Managed PostgreSQL), en gardant Google OAuth et Bunny. C'est la vraie faiblesse actuelle (tableur utilisé comme base).
- **Décider séparément** l'hébergement (Vercel reste valable ; VPS OVH possible mais ajoute de l'exploitation) et la **sortie de Google OAuth** (faisable via magic link + device flow, seulement si l'objectif « zéro Google » est réel).
- **Ne pas migrer** : le **streaming vidéo** (Bunny fait le travail mieux qu'OVH Object Storage pour cet usage) et **l'hébergement mutualisé OVH** (incompatible SSR Node).

**Réponses directes aux questions clés :**
1. Migration « en l'état » vers OVH : **non** — ton offre actuelle (Web Hosting Pro mutualisé PHP/MySQL, confirmée) ne fait pas tourner Node/SSR ; il faut un **nouveau produit** VPS/Public Cloud. 
2. Offre adaptée : **VPS** ou **Public Cloud** (à souscrire), **jamais le mutualisé actuel**. 
3. Next 16 (API/middleware/auth/stream) sur VPS OVH : **oui**. 
4. Le mutualisé existant suffit-il ? **Non** (pas de Node, egress Cloudflare bloqué, pas d'IP fixe). 
5. Streaming proxy viable sur OVH ? **Oui mais inutile** — Bunny CDN gère déjà. 
6. Garder Drive+Sheet ? **Drive déjà remplacé par Bunny** ; Sheet à remplacer par SQL. 
7. OVH héberge-t-il aussi les médias ? **Non recommandé**. 
8. Garder Drive pour les vidéos ? **Non** (déjà Bunny). 
9. Object Storage/CDN OVH ? **Non pertinent ici**. 
10. Remplacer Google OAuth ? **Possible** (magic link/device flow). 
11. Remplacer le Sheet par SQL OVH ? **Oui, recommandé**. 
12. Base : **PostgreSQL managé OVH** (à défaut PG sur VPS ; SQLite mono-instance seulement). 
13-23 : détaillé §5-§15.

**Points bloquants à lever avant tout** : (a) confirmer l'hébergement prod réel de LARAPLAY (Vercel ?) **[à vérifier]** ; (b) confirmer/activer `BUNNY_SECURITY_KEY` + `BUNNY_WEBHOOK_SECRET` **[risque sécurité]** ; (c) vérifier qu'aucune vidéo active ne dépend encore du fallback Drive ; (d) **offre OVH = Web Hosting Pro mutualisé confirmée → inapte à héberger LARAPLAY (pas de Node)** : toute migration d'hébergement OVH nécessite un **nouveau produit** (VPS/Public Cloud) à budgéter ; (e) si l'on veut réutiliser la **MySQL mutualisée existante** pour la base des droits, **valider l'accès distant** (Vercel/VPS → `*.mysql.db`) **[probablement restreint]** ; (f) si un composant OVH mutualisé devait appeler Bunny, **vérifier l'egress** (Cloudflare bloqué sur ce mutualisé).

**Non bloquants** : écarts documentaires (README « Drive »/« NEXTAUTH_SECRET », commentaires « Netlify »), NextAuth encore en beta (à figer), migration `localStorage`→SQL des favoris/progression (optionnelle).

---

*Étude produite sans aucune modification de code, déploiement, action OVH/DNS, création de base ou changement de variable d'environnement. Toutes les conclusions techniques s'appuient sur la lecture du code réel du dépôt ; les éléments OVH tarifaires/offres sont des ordres de grandeur publics 2026 à revérifier, et le contexte du compte OVH personnel n'a pas pu être lu dans cette session.*
