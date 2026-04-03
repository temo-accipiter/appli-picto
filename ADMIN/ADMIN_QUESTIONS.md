# ADMIN_QUESTIONS.md — Dette et points ouverts

## Q1 — Audit log non implémenté pour les actions admin front ⚠️

**Contrat** : FRONTEND_CONTRACT.md §8.10 — "Toute action admin génère un événement dans admin_audit_log (append-only, reason obligatoire)"

**État actuel** : Les hooks `useAdminBankCards` et `useAdminSupportInfo` effectuent les actions (publication/dépublication cartes banque, consultation support) sans écrire dans `admin_audit_log`.

**Approche recommandée** : L'audit doit être atomique (action + log dans la même transaction). La bonne solution est côté DB :

- Soit via des RPCs qui font l'action + INSERT audit dans la même transaction
- Soit via des triggers AFTER INSERT/UPDATE/DELETE sur les tables concernées

L'implémentation côté front (INSERT séparé après l'action) est fragile : si l'INSERT audit échoue, l'action est faite sans trace.

**Priorité** : Post-lancement. Tu es le seul admin — la traçabilité est assurée par ta connaissance des actions. À implémenter avant d'ajouter d'autres admins.

---

## Q2 — Rétention/purge admin_audit_log

**Contrat** : PLATFORM.md §6.3.2 — politique de rétention

**État actuel** : Aucune migration de purge automatisée pour `admin_audit_log`.

**Décision** : Reporté à V2. Volume négligeable en V1 (single admin). À réévaluer si le volume le justifie.

---

## Q3 — Actions admin sans UI (request_account_deletion, resync_subscription, export_proof_evidence)

**Contrat** : PLATFORM.md §6.4 — catalogue d'actions admin

**État actuel** : Les actions sont définies dans l'enum DB `admin_action` mais aucune Edge Function ni UI correspondante n'existe.

**Décision** : En V1, ces actions passent par SQL direct (Supabase Studio). Les Edge Functions dédiées seront créées quand le besoin se confirme.
