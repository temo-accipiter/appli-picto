-- Migration: Corriger les politiques RLS de la table parametres
-- Date: 2025-11-16
-- Description: Autoriser tous les utilisateurs authentifiés à insérer et modifier les paramètres
--              (au lieu de réserver ces actions aux admins uniquement)

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS parametres_insert_all_users ON public.parametres;
DROP POLICY IF EXISTS parametres_update_all_users ON public.parametres;

-- Recréer les politiques avec les permissions correctes
CREATE POLICY parametres_insert_authenticated
ON public.parametres
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY parametres_update_authenticated
ON public.parametres
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
