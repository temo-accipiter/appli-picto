-- Migration: Phase 8.1 — Create Storage Buckets
-- Date: 2026-02-04
--
-- Objectif:
-- Créer les buckets Supabase Storage pour images cartes (bank + personal)
--
-- Buckets créés:
-- - personal-images : bucket privé (public=false), owner-only
-- - bank-images : bucket public (public=true), lecture tous
--
-- Path scheme (source-of-truth ownership):
-- - personal-images : /<account_id>/<card_id>.<ext>
-- - bank-images : /<card_id>.<ext>
--
-- Décisions appliquées:
-- - D2: Admin ne peut JAMAIS accéder fichiers personal (policies RLS Phase 8.2)
-- - Ownership encodé dans le path (pas JOIN vers tables métier)
-- - Immutabilité images personal (UPDATE interdit, Phase 8.2)
--
-- Note: Les policies RLS Storage sont créées en Phase 8.2 (séparation concerns)

BEGIN;

-- ============================================================
-- Bucket: personal-images (privé owner-only)
-- ============================================================
-- Objectif: Images cartes personnelles (type='personal')
-- Accès: Owner uniquement (auth.uid() = account_id dans path)
-- Admin: AUCUN accès (D2 enforcement au niveau fichier)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'personal-images',
  'personal-images',
  FALSE, -- privé (aucun accès public, même avec URL)
  102400, -- 100KB max (cohérent avec contrainte applicative)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] -- formats autorisés
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 102400,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

COMMENT ON COLUMN storage.buckets.public IS
  'personal-images bucket: FALSE (privé owner-only, admin exclu, D2 enforcement)';

-- ============================================================
-- Bucket: bank-images (public lecture, admin écriture)
-- ============================================================
-- Objectif: Images cartes banque (type='bank', published=TRUE)
-- Accès: Lecture publique (anon + authenticated), écriture admin uniquement

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bank-images',
  'bank-images',
  TRUE, -- public (lecture tous, écriture admin via policies RLS)
  1048576, -- 1MB max (cartes banque = qualité professionnelle)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

COMMENT ON COLUMN storage.buckets.public IS
  'bank-images bucket: TRUE (lecture publique, écriture admin via RLS policies)';

-- ============================================================
-- Vérifications post-création
-- ============================================================
-- Les buckets doivent exister avec les bons paramètres

DO $$
DECLARE
  v_personal_public BOOLEAN;
  v_bank_public BOOLEAN;
BEGIN
  -- Vérifier personal-images est privé
  SELECT public INTO v_personal_public
  FROM storage.buckets
  WHERE id = 'personal-images';

  IF v_personal_public IS NULL THEN
    RAISE EXCEPTION 'FAIL: Bucket personal-images not created';
  END IF;

  IF v_personal_public = TRUE THEN
    RAISE EXCEPTION 'FAIL: Bucket personal-images should be private (public=FALSE)';
  END IF;

  -- Vérifier bank-images est public
  SELECT public INTO v_bank_public
  FROM storage.buckets
  WHERE id = 'bank-images';

  IF v_bank_public IS NULL THEN
    RAISE EXCEPTION 'FAIL: Bucket bank-images not created';
  END IF;

  IF v_bank_public = FALSE THEN
    RAISE EXCEPTION 'FAIL: Bucket bank-images should be public (public=TRUE)';
  END IF;

  RAISE NOTICE 'PASS: Storage buckets created successfully (personal-images=private, bank-images=public)';
END $$;

COMMIT;
