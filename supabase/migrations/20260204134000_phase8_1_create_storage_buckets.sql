BEGIN;

-- Phase 8.1 — Create Storage buckets (portable, DB-first strict)
-- No COMMENT ON storage.* objects (owner-only in Supabase; breaks `supabase db reset`)
-- No file_size_limit / allowed_mime_types here unless explicitly decided in product docs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-images', 'personal-images', FALSE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-images', 'bank-images', TRUE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = TRUE;

DO $$
DECLARE
  v_personal_public BOOLEAN;
  v_bank_public BOOLEAN;
BEGIN
  SELECT public INTO v_personal_public
  FROM storage.buckets
  WHERE id = 'personal-images';

  IF v_personal_public IS NULL THEN
    RAISE EXCEPTION 'FAIL: Bucket personal-images not created';
  END IF;
  IF v_personal_public = TRUE THEN
    RAISE EXCEPTION 'FAIL: Bucket personal-images should be private (public=FALSE)';
  END IF;

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
