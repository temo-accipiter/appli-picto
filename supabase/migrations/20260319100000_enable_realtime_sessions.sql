-- ============================================================================
-- Migration : Enable Supabase Realtime for sessions table
-- ============================================================================
--
-- PROBLÈME :
-- Le frontend utilise polling passif (useEffect avec refreshKey) pour détecter
-- les changements de sessions.epoch. Quand la DB incrémente epoch++ via trigger,
-- le frontend ne le sait pas jusqu'au prochain F5 manuel.
--
-- SOLUTION :
-- Activer Supabase Realtime sur la table sessions pour permettre la propagation
-- automatique des changements DB → Frontend via WebSocket.
--
-- IMPACT :
-- - useSessions.ts pourra s'abonner aux UPDATE events sur table sessions
-- - Quand epoch++ ou steps_total_snapshot change en DB → notification immédiate
-- - useEffect epoch detection dans Tableau.tsx se déclenchera automatiquement
-- - Plus besoin de F5 pour voir les changements structurants (Soft Sync temps réel)
--
-- SÉCURITÉ :
-- La RLS sessions est déjà en place (policies sessions_select_owner, etc.).
-- Realtime respecte automatiquement les RLS policies → pas de fuite de données.
--
-- CONTRAT PRODUIT :
-- "Les changements structurants (ajout/suppression slot, modification carte)
--  doivent être visibles en temps réel sur tous les appareils connectés,
--  pour une expérience TSA prévisible et cohérente."
-- ============================================================================

-- Ajouter la table sessions à la publication Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

-- Commentaire explicatif
COMMENT ON TABLE sessions IS 'Table sessions avec Realtime activé pour propagation epoch++ automatique vers frontend (WebSocket)';

-- ============================================================================
-- Ce que cette migration active :
-- - ✅ Propagation temps réel des changements sessions (epoch, snapshot, state)
-- - ✅ Détection immédiate changements structurants sur tous devices
-- - ✅ UX TSA optimale (pas de F5 manuel requis)
-- - ✅ Respect RLS (Realtime filtre automatiquement par policies)
-- - ✅ Multi-device natif (WebSocket broadcast)
-- ============================================================================
