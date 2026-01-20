-- ============================================================================
-- Script migration données : bucket 'cards' → buckets 'cards-bank' + 'cards-user'
-- ============================================================================
-- À exécuter APRÈS migration 008 (split_storage_buckets.sql)
-- ============================================================================

-- ============================================================================
-- 1. ANALYSE : Compter images à migrer
-- ============================================================================

-- Bank cards à migrer vers cards-bank
SELECT COUNT(*) AS bank_cards_count
FROM public.cards
WHERE owner_type = 'bank';

-- User cards à migrer vers cards-user
SELECT COUNT(*) AS user_cards_count
FROM public.cards
WHERE owner_type = 'user';

-- ============================================================================
-- 2. MIGRATION : Mettre à jour image_path dans DB
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Bank cards : 'bank/<card_id>.<ext>' (bucket cards-bank)
-- ----------------------------------------------------------------------------

-- Exemple : ancien path 'bank/abc123.jpg' reste 'bank/abc123.jpg'
-- (déjà bon format, rien à faire si paths déjà corrects)

-- Si ancien format différent, adapter ici :
-- UPDATE public.cards
-- SET image_path = 'bank/' || <card_id> || '.<ext>'
-- WHERE owner_type = 'bank';

-- ----------------------------------------------------------------------------
-- B) User cards : 'user/<owner_id>/<card_id>.<ext>' (bucket cards-user)
-- ----------------------------------------------------------------------------

-- Exemple : ancien path 'user/uuid-owner/abc123.jpg' reste tel quel
-- (déjà bon format, rien à faire si paths déjà corrects)

-- Si ancien format différent, adapter ici :
-- UPDATE public.cards
-- SET image_path = 'user/' || owner_id::text || '/' || <card_id> || '.<ext>'
-- WHERE owner_type = 'user';

-- ============================================================================
-- 3. COPIE PHYSIQUE : Bucket storage (MANUEL ou script externe)
-- ============================================================================

-- Cette étape nécessite script TypeScript/Python ou Supabase CLI :
--
-- Pour chaque image dans ancien bucket 'cards' :
--   1. Lire image depuis 'cards' bucket
--   2. Si path commence par 'bank/' :
--      - Uploader vers bucket 'cards-bank'
--      - Path destination = même path
--   3. Si path commence par 'user/' :
--      - Uploader vers bucket 'cards-user'
--      - Path destination = <owner_id>/<card_id>.<ext> (sans préfixe 'user/')
--
-- Exemple TypeScript (pseudo-code) :
--
-- const { data: files } = await supabase.storage.from('cards').list()
-- for (const file of files) {
--   const { data: blob } = await supabase.storage.from('cards').download(file.name)
--
--   if (file.name.startsWith('bank/')) {
--     await supabase.storage.from('cards-bank').upload(file.name, blob)
--   } else if (file.name.startsWith('user/')) {
--     // Retirer préfixe 'user/' pour bucket cards-user
--     const userPath = file.name.replace(/^user\//, '')
--     await supabase.storage.from('cards-user').upload(userPath, blob)
--   }
-- }

-- ============================================================================
-- 4. VÉRIFICATION : Valider migration réussie
-- ============================================================================

-- Vérifier que tous les image_path correspondent au format attendu
SELECT
  owner_type,
  image_path,
  CASE
    WHEN owner_type = 'bank' AND image_path LIKE 'bank/%' THEN 'OK'
    WHEN owner_type = 'user' AND image_path LIKE 'user/' || owner_id::text || '/%' THEN 'OK'
    ELSE 'INVALID FORMAT'
  END AS path_validation
FROM public.cards
WHERE image_path IS NOT NULL;

-- Compter paths invalides
SELECT COUNT(*) AS invalid_paths_count
FROM public.cards
WHERE image_path IS NOT NULL
  AND NOT (
    (owner_type = 'bank' AND image_path LIKE 'bank/%') OR
    (owner_type = 'user' AND image_path LIKE 'user/' || owner_id::text || '/%')
  );

-- ============================================================================
-- 5. NETTOYAGE : Supprimer ancien bucket 'cards' (OPTIONNEL)
-- ============================================================================

-- ⚠️ ATTENTION : Supprimer UNIQUEMENT après vérification que :
-- 1. Toutes images copiées dans nouveaux buckets
-- 2. Tous paths DB mis à jour
-- 3. App fonctionne correctement avec nouveaux buckets
--
-- DELETE FROM storage.buckets WHERE id = 'cards';
-- ⚠️ IRRÉVERSIBLE - Faire backup avant !

-- ============================================================================
-- 6. NOTES MIGRATION
-- ============================================================================

-- Timeline migration :
-- 1. Appliquer migration 008 (créer nouveaux buckets + policies)
-- 2. Copier images physiquement (script externe)
-- 3. Mettre à jour image_path si nécessaire (UPDATE SQL)
-- 4. Vérifier migration (SELECT validation)
-- 5. Déployer nouvelle version app (utilise nouveaux buckets)
-- 6. Supprimer ancien bucket après période de grâce (ex: 1 semaine)
--
-- Rollback si problème :
-- - Garder ancien bucket 'cards' intact pendant migration
-- - Si échec, revenir à ancienne version app
-- - Supprimer nouveaux buckets si nécessaire
