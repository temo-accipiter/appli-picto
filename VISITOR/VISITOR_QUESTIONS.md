# VISITOR_QUESTIONS.md — Résolutions backend pour l'import Visitor complet

> Généré lors de l'audit et des corrections du 2026-04-01.
> Mis à jour le 2026-04-01 : toutes les questions Q1/Q2/Q3 sont résolues.

---

## Q1 — Import Timelines/Slots ✅ RÉSOLU

**Contrat** : `FRONTEND_CONTRACT.md §7.3` — périmètre import fermé : Timelines + Slots

**Résolution** :

Migration `supabase/migrations/20260401000000_import_visitor_timelines_slots_and_device.sql` créée.

- **RPC** : `import_visitor_timelines_slots_batch(p_slots_json JSONB)`
  - SECURITY INVOKER, valide `auth.uid()` côté DB
  - Validation métier : ≥1 step + exactement 1 reward
  - Supprime les slots auto-créés (minimal step+reward), insère les slots Visitor
  - Fallback `card_id = NULL` si la carte a été supprimée depuis (FK violation uniquement)
  - Toute autre erreur remonte normalement

- **Pattern GUC local** (`app.bypass_slot_guards`) : les 3 triggers de garde
  (`slots_enforce_min_reward`, `slots_enforce_min_step`, `slots_enforce_single_reward`)
  vérifient ce flag LOCAL à la transaction — reset automatique en fin de transaction,
  aucune autre session affectée.

**Frontend** :

- `importVisitorSlots()` (privée dans `importVisitorSequences.ts`) lit les slots IndexedDB
  et appelle le RPC
- `importAllVisitorData()` (exportée) orchestre séquences + slots + cleanup unique IndexedDB
- `useVisitorImport` et `ModalVisitorImport` mis à jour

---

## Q2 — Import Sessions + Progression ✅ RÉSOLU PAR DESIGN

**Contrat** : `FRONTEND_CONTRACT.md §7.3` — périmètre import fermé : Sessions + progression

**Résolution** :

Les sessions Visitor sont **éphémères par conception** — elles représentent une activité
en cours, pas un historique persistant. Importer des sessions passées n'a pas de valeur
métier pour un enfant TSA (l'activité est terminée ou abandonnée).

Décision produit actée :

- Sessions `completed` → non importées (historique sans valeur pour le nouveau compte)
- Sessions `active_started` → non importées (recommencer l'activité est préférable)
- Sessions `active_preview` → non importées (aucune validation, pas d'état à préserver)

**Aucun RPC à créer. Aucun code frontend à modifier.**

---

## Q3 — Mécanisme device_id ✅ RÉSOLU

**Contrat** : `FRONTEND_CONTRACT.md §7.3` — _« le device_id local du Visitor devient
le premier device enregistré du nouveau compte »_

**Résolution** :

Le hook `useDeviceRegistration` gère nativement ce mécanisme :

- Clé localStorage : `appli-picto-device-id`
- Au premier accès authentifié, lit (ou génère) le `device_id` local
- Insère dans la table `devices` avec `account_id = auth.uid()`
- Déjà déclenché automatiquement post-signup — aucun code supplémentaire requis

**Aucune migration supplémentaire nécessaire. Aucun appel explicite à ajouter.**

---

## Q4 — Import Mapping Catégories ✅ NON APPLICABLE

**Contrat** : `FRONTEND_CONTRACT.md §7.3` — périmètre import fermé : Mapping catégories

Les Visitors ne peuvent pas créer de catégories personnelles (bloqué par gating).
Aucun mapping catégorie à importer.

---

## Audit frontend B1/B2/B3 (2026-04-01)

### B1 — `CardsEdition.tsx`

**Verdict : ✅ Conforme**

- Gating Visitor (`useIsVisitor()`) présent et correct
- Aucune query Supabase directe (DB-first respecté)
- Pas d'accès aux données de slots depuis ce composant

### B2 — `useTimelines` / `useSlots`

**Verdict : ✅ Conformes**

- Les deux hooks vérifient `childProfileId === 'visitor-local'` et basculent sur
  IndexedDB (`slotsDB.ts`) sans jamais contacter Supabase en mode Visitor
- Pas de Realtime subscription ouverte pour les Visitors
- Pas d'effet de bord cross-session

### B3 — `useSessions.ts`

**Verdict : ✅ Conforme** (faux positif du premier audit automatisé)

- Ligne 160 : `return` explicite dans le `useEffect` pour la branche Visitor
- La subscription Realtime (lignes 228+) n'est **jamais** atteinte en mode Visitor
- Sessions Visitor stockées uniquement dans IndexedDB, aucune fuite vers Supabase

---

## Résumé final

| #   | Sujet                       | Statut               | Action restante |
| --- | --------------------------- | -------------------- | --------------- |
| Q1  | Import slots                | ✅ RÉSOLU            | Aucune          |
| Q2  | Import sessions             | ✅ RÉSOLU PAR DESIGN | Aucune          |
| Q3  | device_id Visitor           | ✅ RÉSOLU            | Aucune          |
| Q4  | Mapping catégories          | ✅ NON APPLICABLE    | Aucune          |
| B1  | Audit CardsEdition          | ✅ CONFORME          | Aucune          |
| B2  | Audit useTimelines/useSlots | ✅ CONFORMES         | Aucune          |
| B3  | Audit useSessions           | ✅ CONFORME          | Aucune          |
