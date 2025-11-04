-- Migration: Ajouter le paramètre toasts_enabled
-- Date: 2025-10-29
-- Description: Permet d'activer/désactiver les toasts dans l'application

-- Ajouter la colonne toasts_enabled dans parametres
ALTER TABLE parametres
ADD COLUMN IF NOT EXISTS toasts_enabled BOOLEAN DEFAULT true;

-- Mettre à jour les enregistrements existants pour activer les toasts par défaut
UPDATE parametres
SET toasts_enabled = true
WHERE toasts_enabled IS NULL;
