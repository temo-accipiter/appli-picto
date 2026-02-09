BEGIN;

-- ------------------------------------------------------------
-- Drop expected policies if they already exist (idempotent)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS personal_images_select_owner ON storage.objects;
DROP POLICY IF EXISTS personal_images_insert_owner ON storage.objects;
DROP POLICY IF EXISTS personal_images_delete_owner ON storage.objects;

DROP POLICY IF EXISTS bank_images_select_public ON storage.objects;
DROP POLICY IF EXISTS bank_images_insert_admin ON storage.objects;
DROP POLICY IF EXISTS bank_images_update_admin ON storage.objects;
DROP POLICY IF EXISTS bank_images_delete_admin ON storage.objects;

-- ------------------------------------------------------------
-- PERSONAL IMAGES (private)
-- Goals:
-- - Owner-only SELECT/INSERT/DELETE
-- - No UPDATE policy (immutability)
-- - Path traversal guard: name NOT LIKE '%..%'
-- - Structure: "<auth.uid()>/<uuid>.<ext>" (single level)
-- ------------------------------------------------------------

CREATE POLICY personal_images_select_owner
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'personal-images'
  AND owner = auth.uid()
  AND name NOT LIKE '%..%'
  AND name ~ ('^' || auth.uid()::text || '/[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$')
);

CREATE POLICY personal_images_insert_owner
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'personal-images'
  AND owner = auth.uid()
  AND name NOT LIKE '%..%'
  AND name ~ ('^' || auth.uid()::text || '/[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$')
);

CREATE POLICY personal_images_delete_owner
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'personal-images'
  AND owner = auth.uid()
  AND name NOT LIKE '%..%'
  AND name ~ ('^' || auth.uid()::text || '/[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$')
);

-- ------------------------------------------------------------
-- BANK IMAGES (public read)
-- Goals:
-- - Public SELECT (anon + authenticated)
-- - Write (INSERT/UPDATE/DELETE) restricted to admin only
-- - Path traversal guard: name NOT LIKE '%..%'
-- - Flat structure: "<uuid>.<ext>" (no subdirectories)
-- ------------------------------------------------------------

CREATE POLICY bank_images_select_public
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'bank-images'
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'
);

CREATE POLICY bank_images_insert_admin
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-images'
  AND is_admin()
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'
);

CREATE POLICY bank_images_update_admin
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bank-images'
  AND is_admin()
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'
)
WITH CHECK (
  bucket_id = 'bank-images'
  AND is_admin()
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'
);

CREATE POLICY bank_images_delete_admin
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bank-images'
  AND is_admin()
  AND name NOT LIKE '%..%'
  AND name NOT LIKE '%/%'
  AND name ~ '^[0-9A-Fa-f-]{36}\\.[A-Za-z0-9]+$'
);

COMMIT;
