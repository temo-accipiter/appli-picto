-- Migration: Permettre aux visiteurs (anon) d'accéder aux paramètres globaux
-- Date: 2025-11-19
-- Description: Ajoute les policies SELECT pour le rôle anon sur la table parametres

-- Drop les anciennes policies restrictives
DROP POLICY IF EXISTS "parametres_select_all_users" ON public.parametres;
DROP POLICY IF EXISTS "parametres_insert_authenticated" ON public.parametres;

-- Créer les nouvelles policies avec accès anon pour SELECT
CREATE POLICY "parametres_select_all_including_anon"
  ON public.parametres
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT reste réservé aux authenticated (pas de création par visiteurs)
CREATE POLICY "parametres_insert_authenticated_only"
  ON public.parametres
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- COMMENT: Les visiteurs peuvent maintenant lire les paramètres globaux
-- mais ne peuvent pas en créer (sécurité maintenue)
COMMENT ON POLICY "parametres_select_all_including_anon" ON public.parametres
  IS 'Permet aux visiteurs (anon) et authentifiés de lire les paramètres globaux';
