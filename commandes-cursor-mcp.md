## 1. @supabase GET /schema

Rôle : renvoie toutes les tables/colonnes/types de ta base.

À quoi ça sert : donner à l’IA la vue d’ensemble → pour proposer de nouvelles colonnes, vérifier les types, voir si des colonnes sont redondantes ou mal nommées.

👉 Prompt utile :

@supabase GET /schema
Analyse le schéma et propose :

- colonnes qui mériteraient un index
- colonnes avec types discutables (ex: text vs uuid)
- tables redondantes
  Donne-moi le SQL exact pour corriger.

## 2. @supabase GET /diagnose/rls

Rôle : appelle la fonction fn_rls_audit() → diagnostic des Row Level Security.

À quoi ça sert : voir quelles tables ont RLS activé, combien de policies, et s’il en manque.

👉 Prompt utile :

@supabase GET /diagnose/rls
Identifie les tables avec RLS activé mais sans policy.
Propose-moi les CREATE POLICY manquants (SELECT/INSERT/UPDATE/DELETE)
basés sur la colonne user_id.

## 3. @supabase GET /diagnose/fk-indexes

Rôle : appelle la fonction fn_fk_index_gaps() → trouve les foreign keys sans index.

À quoi ça sert : optimiser les requêtes (éviter les Seq Scan coûteux).

👉 Prompt utile :

@supabase GET /diagnose/fk-indexes
Liste uniquement celles avec index_exists=false
et donne le SQL CREATE INDEX CONCURRENTLY pour corriger.

## 4. @supabase POST /explain { "sql": "..." }

Rôle : exécute EXPLAIN (FORMAT JSON) sur ta requête.

À quoi ça sert : analyser le plan d’exécution → savoir si un index est manquant ou si un filtre est mal optimisé.

👉 Prompt utile :

@supabase POST /explain { "sql": "select \* from public.taches where user_id='...' order by created_at desc limit 50" }
Analyse ce plan, dis-moi si un Seq Scan apparaît,
et propose un index optimal pour accélérer la requête.

## 5. @supabase GET /indexes

Renvoie la liste de tous les index existants.
👉 Prompt utile :

@supabase GET /indexes
Analyse tous les index existants et propose ceux qui semblent inutilisés ou redondants.

## 6. @supabase GET /policies

Renvoie toutes les RLS policies.
👉 Prompt utile :

@supabase GET /policies
Analyse mes policies et vérifie :

- si elles couvrent toutes les opérations (SELECT/INSERT/UPDATE/DELETE)
- si certaines sont trop permissives
- propose le SQL exact à corriger.

## 7. @supabase GET /triggers

Renvoie tous les triggers.
👉 Prompt utile :

@supabase GET /triggers
Liste les triggers et dis-moi :

- lesquels sont critiques pour l’intégrité des données
- s’il y a des triggers qui peuvent causer des problèmes de perf ou sécurité
- propose une meilleure écriture si besoin.

## 8. @supabase GET /mcp (discovery)

Liste tous les endpoints que ton bridge expose.
👉 Prompt utile :

@supabase GET /mcp
Montre-moi la liste des outils disponibles pour diagnostiquer ma base.

## 9. @supabase GET /health

Juste un “ping” (debug).

## checklist d’audit/debug Supabase prête à l’emploi pour Cursor

Tu peux la suivre dans l’ordre ou piocher selon ton besoin.
Chaque bloc contient les commandes @supabase et un prompt court à coller juste après la réponse JSON pour que Cursor propose des actions (SQL exact).

# 1) Check rapide (1–2 min)

Commande:
@supabase GET /health
@supabase GET /mcp

Prompt:
Vérifie que les endpoints listés sont bien disponibles et dis-moi ce que chaque outil permet de diagnostiquer.

# 2) Vue d’ensemble du schéma

Commande:
@supabase GET /schema

Prompt:
Analyse ce schéma et propose :

- colonnes à indexer (filtres fréquents, JOIN, ORDER BY),
- types douteux (text vs uuid/date/boolean),
- colonnes nullables à sécuriser,
- redondances évidentes.
  Donne le SQL exact pour chaque amélioration (CREATE INDEX, ALTER TABLE…).

# 3) RLS – sécurité (priorité haute)

Commande:
@supabase GET /diagnose/rls

Prompt:
Montre les tables avec rls_enabled=true mais 0 policy, ou policies incomplètes (manque SELECT/INSERT/UPDATE/DELETE).
Propose les CREATE POLICY minimales basées sur user_id (ou autre clé de propriétaire si détectée).
Explique le risque de chaque table et donne le SQL exact.

Commande (policies détaillées):
@supabase GET /policies

Prompt:
Repère les policies trop permissives (TRUE ou roles = anon/auth trop larges).
Propose des versions plus strictes (USING / WITH CHECK) avec justification.

# 4) Index manquants (FK + requêtes usuelles)

Commande:
@supabase GET /diagnose/fk-indexes

Prompt:
Filtre les lignes avec index_exists=false.
Génère le SQL CREATE INDEX CONCURRENTLY IF NOT EXISTS pour chaque FK détectée.
Explique le gain attendu (éviter Seq Scan / accélérer les JOIN).

Commande (index existants):
@supabase GET /indexes

Prompt:
Repère les index dupliqués ou redondants et propose des DROP INDEX IF EXISTS sûrs.

# 5) Requête lente – analyse de perf

Commande:
@supabase POST /explain { "sql": "SELECT ... ta requête ..." }

Prompt:
Analyse le plan: Seq Scan? Sort? Nested Loop coûteux?
Propose l’index minimal (ou la réécriture SQL) pour réduire le coût.
Donne le SQL exact et explique l’impact attendu (ordre de grandeur).

Exemple prêt à coller :

@supabase POST /explain { "sql": "select \* from public.taches where user_id='USER' order by created_at desc limit 50" }

# 6) Triggers – intégrité & perfs

Commande:
@supabase GET /triggers

Prompt:
Classe les triggers par criticité (intégrité, audit, nettoyage).
Signale ceux qui s’exécutent trop souvent (BEFORE/AFTER sur grosses tables) ou font des opérations lourdes.
Propose une version plus efficace si nécessaire (ex: trigger conditionnel, index, job async).

# 7) Plan d’action priorisé (synthèse)

Commande:
@supabase GET /schema
@supabase GET /policies
@supabase GET /diagnose/rls
@supabase GET /diagnose/fk-indexes
@supabase GET /indexes

Prompt:
Fais une synthèse priorisée en 3 niveaux (P1 critique sécurité/fiabilité, P2 perfs visibles, P3 confort/entretien).
Pour chaque item, fournis le SQL exact et une estimation du bénéfice/risque.

# 8) Avant / après déploiement (petit rituel)

Avant
@supabase GET /diagnose/rls
@supabase GET /diagnose/fk-indexes

Prompt:
Y a-t-il des régressions de sécurité (RLS manquantes) ou des FK non indexées introduites récemment ?
Donne seulement les diffs à appliquer (SQL exact).

Après:
@supabase POST /explain { "sql": "SELECT ... requête clé de prod ..." }

Prompt:
Compare ce plan à la précédente analyse (si tu t’en souviens). Le coût a-t-il augmenté ?
Propose une correction immédiate si oui.

# 9) Debug guidé à partir d’un bug réel

Prompt prêt à coller

BUG:
[colle ici l’erreur exacte des logs ou du navigateur]

Contexte:

- ce composant ou cette fonction appelle Supabase (copie un court extrait)
- la table concernée est [nom_table], la colonne clé est [user_id?].

Tâche:

1. Dis-moi si c’est un problème RLS, index, trigger ou code client.
2. Si c’est RLS → propose le CREATE POLICY.
3. Si c’est perf → donne le @supabase POST /explain à exécuter et l’index recommandé.
4. Si c’est code → propose un patch minimal côté client (fetch, types, pagination…).

# 10) (Option) Snapshot pour analyse hors-ligne

Si tu veux un fichier unique à glisser dans le chat (Auto context) :

./scripts/ai-refresh-schema.sh

Prompt:
Analyse ce snapshot (schema/indexes/policies/triggers/diagnostics) et propose un plan d’amélioration avec le SQL exact.
