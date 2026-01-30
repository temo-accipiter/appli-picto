-- Migration: Phase 1 — Extensions et Enums de base
-- Description: Créer extensions et types enum utilisés dans toutes les tables
-- Date: 2026-01-30

-- Extensions PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum: Statut utilisateur (Free, Abonné, Admin)
-- Note: Visitor n'existe PAS en DB (local-only jusqu'au signup)
CREATE TYPE account_status AS ENUM ('free', 'subscriber', 'admin');

-- Enum: Statut profil enfant (actif vs verrouillé après downgrade)
CREATE TYPE child_profile_status AS ENUM ('active', 'locked');

-- Enum: Type de carte (banque Admin vs personnelle utilisateur)
CREATE TYPE card_type AS ENUM ('bank', 'personal');

-- Enum: Type de slot timeline (étape vs récompense)
CREATE TYPE slot_kind AS ENUM ('step', 'reward');

-- Enum: État de session (prévisualisation, démarrée, terminée)
CREATE TYPE session_state AS ENUM ('active_preview', 'active_started', 'completed');

-- ============================================================
-- Ce que cette migration introduit:
-- - Extension pgcrypto pour génération UUID (gen_random_uuid())
-- - 5 enums utilisés dans toutes les tables métier (account_status, child_profile_status, card_type, slot_kind, session_state)
-- ============================================================
