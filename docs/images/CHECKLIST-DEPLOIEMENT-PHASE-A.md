# ✅ CHECKLIST PRÉ-DÉPLOIEMENT - PHASE A

**Système de traitement d'images privées (Supabase Storage)**

**Version :** Phase A
**Date :** 24 octobre 2025
**Auteur :** Temo + Claude Code

---

## 📋 VUE D'ENSEMBLE

Cette checklist garantit que **tous les composants** de la Phase A sont correctement configurés, testés et prêts pour la production.

**⚠️ IMPORTANT :** Cochez chaque case **avant** de déployer en production.

---

## 🗄️ BASE DE DONNÉES (SUPABASE)

### Migrations SQL

- [ ] **Migration 1 appliquée** : `20251024000001_enhance_user_assets.sql`
  - [ ] Colonnes ajoutées : `version`, `sha256_hash`, `width`, `height`, `deleted_at`, `migrated_at`
  - [ ] Index créés : `idx_user_assets_unique_hash`, `idx_user_assets_version`, `idx_user_assets_deleted`
  - [ ] Commentaires documentation présents

- [ ] **Migration 2 appliquée** : `20251024000002_add_check_duplicate_image.sql`
  - [ ] Fonction `check_duplicate_image()` existe
  - [ ] Permissions `GRANT EXECUTE` configurées
  - [ ] Test manuel : `SELECT check_duplicate_image('user_id', 'fake_hash')`

- [ ] **Migration 3 appliquée** : `20251024000003_add_image_metrics.sql`
  - [ ] Table `image_metrics` créée
  - [ ] Colonne calculée `compression_ratio` fonctionne
  - [ ] Index créés : `idx_image_metrics_user`, `idx_image_metrics_result`, `idx_image_metrics_date`, `idx_image_metrics_asset_type`
  - [ ] Fonction `get_image_analytics_summary()` existe
  - [ ] RLS activée sur `image_metrics`
  - [ ] Policies créées : `Users view own metrics`, `Users insert own metrics`, `Admins view all metrics`

- [ ] **Migration 4 appliquée** : `20251024000004_add_check_image_quota.sql`
  - [ ] Fonction `check_image_quota()` existe
  - [ ] Permissions configurées
  - [ ] Test manuel : `SELECT check_image_quota('user_id', 'task_image', 20000)`

- [ ] **Schema.sql à jour** : Exécuter `yarn db:dump` et vérifier schema.sql contient toutes les migrations

### Vérifications PostgreSQL

- [ ] **RLS activée** sur `user_assets` : `SELECT tablename FROM pg_tables WHERE tablename = 'user_assets' AND rowsecurity = true`
- [ ] **RLS activée** sur `image_metrics` : Vérifier `rowsecurity = true`
- [ ] **Policies testées** :
  - [ ] User A ne peut pas voir assets de User B
  - [ ] User A ne peut pas modifier assets de User B
  - [ ] Admin peut voir tous les assets
  - [ ] RPC `check_duplicate_image()` autorisé pour authenticated users
  - [ ] RPC `check_image_quota()` autorisé pour authenticated users
  - [ ] RPC `get_image_analytics_summary()` autorisé pour admins uniquement

### Storage Supabase

- [ ] **Bucket `images` existe** : Vérifier Supabase Dashboard → Storage
- [ ] **Bucket `images` configuré privé** : Pas d'accès public
- [ ] **RLS Storage activée** :
  - [ ] Policy `Users upload to own folder` existe
  - [ ] Policy `Users read own files` existe
  - [ ] Policy `Users delete own files` existe
  - [ ] Policy `Admins access all files` existe
- [ ] **Test upload manuel** : Upload fichier via Dashboard → Storage → `images/{test_user_id}/test.png`
- [ ] **Test signed URL** : Générer signed URL (24h) et vérifier accès

---

## ⚛️ FRONTEND (REACT + VITE)

### Dépendances npm

- [ ] **Package `heic2any` installé** : Vérifier `package.json` contient `"heic2any": "^0.0.4"`
- [ ] **Package `canvas` installé (devDependencies)** : Pour génération fixtures tests
- [ ] **Yarn install réussi** : Exécuter `yarn install` sans erreurs

### Configuration

- [ ] **Variables d'environnement `.env` configurées** :
  - [ ] `VITE_SUPABASE_URL` défini
  - [ ] `VITE_SUPABASE_ANON_KEY` défini
  - [ ] Variables valides (testées avec `supabase.auth.getSession()`)

### Fichiers créés/modifiés

- [ ] **Configuration** : `src/utils/images/config.js` existe avec nouvelles constantes (20 KB, 192px, 24h TTL)
- [ ] **Validation** : `src/utils/images/imageValidator.js` existe
- [ ] **Conversion HEIC** : `src/utils/images/heicConverter.js` existe
- [ ] **Compression WebP** : `src/utils/images/webpConverter.js` existe
- [ ] **Upload retry** : `src/utils/upload/uploadWithRetry.js` existe
- [ ] **Pipeline upload** : `src/utils/storage/modernUploadImage.js` existe
- [ ] **Signed URLs** : `src/utils/storage/getSignedUrl.js` existe (logs debug supprimés)
- [ ] **Service Worker registration** : `src/utils/serviceWorker/register.js` existe
- [ ] **Service Worker** : `public/sw.js` existe
- [ ] **Hooks modifiés** :
  - [ ] `src/hooks/useTachesEdition.js` utilise `modernUploadImage()` et `replaceImage()`
  - [ ] `src/hooks/useRecompenses.js` utilise `modernUploadImage()` et `replaceImage()`
- [ ] **Composant UploadProgress** :
  - [ ] `src/components/ui/upload-progress/UploadProgress.jsx` existe
  - [ ] `src/components/ui/upload-progress/UploadProgress.scss` existe
  - [ ] Exporté dans `src/components/index.js`
- [ ] **Composant ImageAnalytics** :
  - [ ] `src/components/features/admin/ImageAnalytics.jsx` existe
  - [ ] `src/components/features/admin/ImageAnalytics.scss` existe
  - [ ] Exporté dans `src/components/index.js`
  - [ ] Intégré dans `/admin-permissions` (onglet "Analytics Images")

### Tests

- [ ] **Tests unitaires passent** : `yarn test` (0 erreurs)
- [ ] **Tests E2E fixtures** :
  - [ ] Fichiers fixtures existent : `icon.svg`, `test-image.png`, `large-image.jpg`, `small-image.png`
  - [ ] Tests E2E passent : `yarn test:e2e` (4 tests actifs passent)
- [ ] **Coverage acceptable** : `yarn test:coverage` (≥ 70% lignes critiques)

### Build & Lint

- [ ] **Lint passe** : `yarn lint` (0 erreurs)
- [ ] **Format OK** : `yarn format` appliqué
- [ ] **Check complet** : `yarn check` (lint:fix + format) réussi
- [ ] **Build production réussi** : `yarn build` sans erreurs
  - [ ] Taille bundle acceptable (< 2 MB gzip)
  - [ ] Pas de warnings critiques
- [ ] **Preview production testé** : `yarn preview`
  - [ ] Application charge correctement
  - [ ] Service Worker enregistré (vérifier DevTools → Application)
  - [ ] Upload image fonctionne
  - [ ] Cache Service Worker fonctionne (vérifier Cache Storage)

---

## 🔧 SERVICE WORKER

### Configuration

- [ ] **Fichier `public/sw.js` accessible** : Tester `http://localhost:5173/sw.js` (doit retourner le fichier)
- [ ] **HTTPS activé en production** : Service Worker nécessite HTTPS (sauf localhost)
- [ ] **Scope correct** : Service Worker enregistré avec scope `/`

### Fonctionnalités

- [ ] **Cache fonctionne** : Upload image → recharger page → image chargée depuis cache
- [ ] **TTL 1h respecté** : Image en cache < 1h → chargée depuis cache ; image > 1h → re-fetch network
- [ ] **Placeholder offline** : Désactiver réseau → images affichent placeholder SVG pastel
- [ ] **Invalidation cache** : Remplacer image → ancienne URL invalidée, nouvelle chargée

### Vérifications DevTools

- [ ] **Service Worker enregistré** : DevTools → Application → Service Workers → Status "activated"
- [ ] **Cache Storage peuplé** : DevTools → Application → Cache Storage → `appli-picto-images-v1` contient images
- [ ] **Pas d'erreurs console** : Console propre (pas de logs `getSignedUrl`)

---

## 🔄 MIGRATION IMAGES EXISTANTES

### Script migration

- [ ] **Fichier `scripts/migrate-existing-images.js` existe**
- [ ] **Package `dotenv` installé** : Requis pour chargement `.env`
- [ ] **Variables d'environnement configurées** :
  - [ ] `VITE_SUPABASE_URL` dans `.env`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` dans `.env` (⚠️ NE PAS commit)

### Tests migration

- [ ] **Dry-run 10 images** : `node scripts/migrate-existing-images.js --limit=10`
  - [ ] Rapport affiché (succès/échecs)
  - [ ] 0 modifications BDD (DRY RUN)
- [ ] **Dry-run 100 images** : `node scripts/migrate-existing-images.js --limit=100`
  - [ ] Performance acceptable (< 5 min)
  - [ ] Taux succès ≥ 95%
- [ ] **Analyser erreurs** : Si échecs > 5%, vérifier `migration-errors-{timestamp}.json`
- [ ] **Migration LIVE planifiée** :
  - [ ] Backup BDD créé avant migration
  - [ ] Maintenance mode activé (éviter uploads concurrents)
  - [ ] Commande préparée : `node scripts/migrate-existing-images.js --live`

---

## 📊 MONITORING & ANALYTICS

### Dashboard admin

- [ ] **Page `/admin-permissions` accessible** : Se connecter en tant qu'admin
- [ ] **Onglet "Analytics Images" visible**
- [ ] **Dashboard affiche statistiques** :
  - [ ] Uploads totaux (7 derniers jours)
  - [ ] Succès vs échecs
  - [ ] Compression moyenne
  - [ ] Temps conversion/upload
  - [ ] Stockage économisé
- [ ] **Fonction RPC appelée** : Vérifier logs Supabase → `get_image_analytics_summary()`
- [ ] **Pas d'erreurs permissions** : Admin peut accéder, non-admin bloqué

### Métriques collectées

- [ ] **Table `image_metrics` peuplée** : Après uploads tests, vérifier lignes insérées
- [ ] **Données cohérentes** :
  - [ ] `original_size > compressed_size`
  - [ ] `compression_ratio` calculé correctement
  - [ ] `result = 'success'` pour uploads réussis
  - [ ] `conversion_ms` et `upload_ms` > 0
- [ ] **RLS fonctionne** : User A ne voit que ses métriques, admin voit toutes

---

## 📏 QUOTAS & LIMITATIONS

### Vérifications quotas

- [ ] **Utilisateur Free bloqué à 7 images** :
  - [ ] Upload 5 tâches → OK
  - [ ] Upload 2 récompenses → OK
  - [ ] Upload 6ème tâche → BLOQUÉ (modal quota)
- [ ] **Utilisateur Abonné limite 50 images** :
  - [ ] Upload 40 tâches + 10 récompenses → OK
  - [ ] Upload 41ème tâche → BLOQUÉ
- [ ] **Admin illimité** :
  - [ ] Peut uploader > 50 images
  - [ ] Pas de modal quota

### Déduplication

- [ ] **Upload même fichier 2× → 1 seul storage** :
  - [ ] Upload `test-image.png`
  - [ ] Upload `test-image.png` à nouveau
  - [ ] Vérifier table `user_assets` : même `sha256_hash`, même `file_path`
  - [ ] Vérifier Storage : 1 seul fichier physique

---

## 🔒 SÉCURITÉ

### Tests sécurité

- [ ] **User A ne peut pas accéder images User B** :
  - [ ] Tester signed URL User B avec session User A → 403 Forbidden
- [ ] **Upload fichier .exe déguisé en .png** :
  - [ ] Renommer `test.exe` → `test.png`
  - [ ] Upload → BLOQUÉ (validation magic bytes)
- [ ] **Upload fichier > 10 MB** :
  - [ ] Créer fichier 15 MB
  - [ ] Upload → BLOQUÉ (validation taille)
- [ ] **Injection SQL via filename** :
  - [ ] Upload fichier nommé `'; DROP TABLE user_assets; --`
  - [ ] Vérifier aucune erreur SQL (paramètres bindés)
- [ ] **HTTPS obligatoire en production** : Vérifier certificat SSL valide
- [ ] **Content-Security-Policy headers** : Vérifier CSP bloque `<script>` inline dans SVG

---

## 🧪 TESTS MANUELS COMPLETS

### Workflow upload tâche (utilisateur Free)

- [ ] **1. Connexion** : Se connecter avec compte Free
- [ ] **2. Aller édition** : `/edition`
- [ ] **3. Ajouter tâche** : Clic bouton "+" → modal s'ouvre
- [ ] **4. Upload PNG 80 KB** :
  - [ ] Sélectionner fichier PNG
  - [ ] Progress bar visible avec messages ("Vérification...", "Optimisation...", "Envoi...")
  - [ ] Progress 0% → 100% en ~2-5s
- [ ] **5. Image affichée** :
  - [ ] Tâche créée avec image visible
  - [ ] Image ≤ 20 KB (vérifier DevTools → Network)
  - [ ] Dimensions 192×192 (vérifier dimensions image)
- [ ] **6. Vérifier BDD** :
  - [ ] Table `user_assets` : 1 ligne ajoutée avec `sha256_hash`, `width`, `height`, `version=1`
  - [ ] Table `image_metrics` : 1 ligne ajoutée avec `result='success'`
- [ ] **7. Vérifier cache** :
  - [ ] DevTools → Application → Cache Storage → image présente
  - [ ] Désactiver réseau → recharger page → image visible (cache)

### Workflow upload HEIC (iPhone)

- [ ] **1. Upload fichier HEIC** : Sélectionner photo iPhone .HEIC
- [ ] **2. Conversion automatique** : Progress "Conversion iPhone..." visible
- [ ] **3. Image affichée** : WebP final affiché (pas HEIC)
- [ ] **4. Vérifier metrics** : `conversion_method = 'heic_to_jpeg_then_webp'`

### Workflow remplacement image

- [ ] **1. Tâche existante avec image** : Créer tâche avec image A
- [ ] **2. Remplacer image** : Clic bouton "Remplacer" → sélectionner image B
- [ ] **3. Upload nouvelle version** : Progress bar visible
- [ ] **4. Image remplacée** : Image B affichée (plus image A)
- [ ] **5. Vérifier versioning** :
  - [ ] Table `user_assets` : ancienne ligne `deleted_at NOT NULL`, `version=1`
  - [ ] Nouvelle ligne `deleted_at NULL`, `version=2`
- [ ] **6. Cache invalidé** : Ancienne URL plus en cache, nouvelle URL cachée

### Workflow quota dépassé

- [ ] **1. Upload 5 tâches** (utilisateur Free)
- [ ] **2. Upload 2 récompenses**
- [ ] **3. Upload 6ème tâche** :
  - [ ] Modal quota s'ouvre
  - [ ] Message "Quota atteint. Passez à Abonné..."
  - [ ] Bouton "Passer à Abonné" visible
  - [ ] Upload bloqué (pas d'appel Storage)

### Workflow admin analytics

- [ ] **1. Se connecter admin** : Compte avec rôle Admin
- [ ] **2. Aller admin** : `/admin-permissions`
- [ ] **3. Onglet Analytics** : Clic "Analytics Images"
- [ ] **4. Dashboard affiché** :
  - [ ] 7 cartes statistiques visibles
  - [ ] Données cohérentes (succès + échecs = total)
  - [ ] Compression moyenne > 0%
  - [ ] Stockage économisé > 0 MB
- [ ] **5. Refresh données** : Faire upload → recharger page → stats mises à jour

---

## 📝 DOCUMENTATION

- [ ] **`docs/IMAGES-SYSTEME.md` créé** : Documentation technique complète
- [ ] **`docs/CHECKLIST-DEPLOIEMENT-PHASE-A.md` créé** : Cette checklist
- [ ] **Fichiers à jour** :
  - [ ] `CLAUDE.md` contient référence à Phase A images (optionnel)
  - [ ] `README.md` mentionne nouveau système images (optionnel)
- [ ] **Changelog créé** : Documenter changements Phase A (optionnel)

---

## 🚀 PRÉ-DÉPLOIEMENT FINAL

### Backup & sécurité

- [ ] **Backup BDD créé** : Dump PostgreSQL avant déploiement
- [ ] **Backup Storage créé** : Export bucket `images` (Supabase Dashboard → Storage → Download)
- [ ] **Variables d'environnement production configurées** :
  - [ ] `VITE_SUPABASE_URL` (production)
  - [ ] `VITE_SUPABASE_ANON_KEY` (production)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` sécurisé (ne pas exposer frontend)
- [ ] **Secrets rotationnés** : Si déploiement critique, regénérer clés Supabase

### Monitoring production

- [ ] **Logs Supabase configurés** : Dashboard → Logs → Edge Functions activés
- [ ] **Alertes configurées** :
  - [ ] Quota Storage Supabase > 80% → email admin
  - [ ] Taux erreur uploads > 10% → email admin
- [ ] **Rollback plan préparé** :
  - [ ] Commande revert migrations préparée
  - [ ] Backup BDD accessible rapidement

### Communication

- [ ] **Utilisateurs informés** : Email/notification sur nouveau système images (optionnel)
- [ ] **Équipe dev briefée** : Expliquer changements Phase A
- [ ] **Support formé** : Équipe support connaît troubleshooting images

---

## ✅ VALIDATION FINALE

### Critères bloquants (MUST HAVE)

- [ ] ✅ **TOUTES migrations SQL appliquées** et testées
- [ ] ✅ **Build production réussi** sans erreurs
- [ ] ✅ **Tests E2E passent** (4/4 actifs)
- [ ] ✅ **Quotas fonctionnent** (Free bloqué à 7, Abonné à 50)
- [ ] ✅ **RLS activée** sur toutes tables/buckets
- [ ] ✅ **Service Worker fonctionne** (cache 1h, placeholder offline)
- [ ] ✅ **Déduplication fonctionne** (même fichier 2× = 1 storage)

### Critères recommandés (SHOULD HAVE)

- [ ] ⚠️ **Migration images existantes testée** (dry-run 100 images)
- [ ] ⚠️ **Dashboard analytics accessible** admin
- [ ] ⚠️ **Backup BDD/Storage créé** avant déploiement
- [ ] ⚠️ **Documentation `IMAGES-SYSTEME.md` créée**

### Go/No-Go déploiement

**SI TOUS critères bloquants ✅ → 🟢 GO DÉPLOIEMENT**

**SI 1+ critères bloquants ❌ → 🔴 NO-GO (corriger avant)**

---

## 📞 SUPPORT POST-DÉPLOIEMENT

**En cas de problème production :**

1. ✅ Consulter `docs/IMAGES-SYSTEME.md` → section Troubleshooting
2. ✅ Vérifier logs Supabase Dashboard → Logs → Edge Functions / Database
3. ✅ Vérifier console navigateur utilisateur (F12 → Console)
4. ✅ Tester en mode incognito (éliminer cache)
5. ✅ Rollback migrations si critique (avoir backup BDD prêt)

**Contacts :**

- **Dev lead** : Temo
- **Supabase support** : https://supabase.com/support
- **Documentation** : `docs/IMAGES-SYSTEME.md`

---

**✅ Checklist complétée le :** ****\_\_****

**✅ Déployé par :** ****\_\_****

**✅ Date déploiement :** ****\_\_****

**✅ Version déployée :** Phase A v1.0
