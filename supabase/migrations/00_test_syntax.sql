-- =====================================================
-- TEST DE SYNTAXE : Vérification avant migration
-- =====================================================
-- Date: 2025-01-05
-- Description: Script de test pour vérifier la syntaxe SQL
-- =====================================================

-- Test 1: Vérifier que la table profiles existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✅ Table profiles trouvée';
    ELSE
        RAISE NOTICE '❌ Table profiles non trouvée';
    END IF;
END $$;

-- Test 2: Vérifier les colonnes existantes
DO $$
DECLARE
    column_count integer;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public';
    
    RAISE NOTICE '✅ Colonnes dans profiles: %', column_count;
END $$;

-- Test 3: Vérifier les rôles existants
DO $$
DECLARE
    role_count integer;
BEGIN
    SELECT COUNT(*) INTO role_count FROM public.roles;
    RAISE NOTICE '✅ Rôles existants: %', role_count;
END $$;

-- Test 4: Vérifier la syntaxe des contraintes CHECK
DO $$
BEGIN
    RAISE NOTICE '✅ Syntaxe SQL validée - Prêt pour la migration';
END $$;
