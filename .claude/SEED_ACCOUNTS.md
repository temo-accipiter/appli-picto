# 🔐 Comptes de Test (Développement Local)

Ce fichier documente les comptes de test créés automatiquement par `supabase/seed.sql`.

---

## 📋 Comptes Disponibles

### 👤 Compte Admin

```
Email    : admin@local.dev
Password : Admin1234x
Statut   : admin
UUID     : aaaaaaaa-aaaa-aaaa-aaaa-000000000001
```

**Droits** :
- ✅ Accès illimité (quotas désactivés)
- ✅ Accès routes `/admin/*`
- ✅ Accès panel administration
- ✅ Gestion utilisateurs
- ✅ Logs et métriques

---

### 👤 Compte Subscriber (Abonné)

```
Email    : test-subscriber@local.dev
Password : Test1234x
Statut   : subscriber
UUID     : bbbbbbbb-bbbb-bbbb-bbbb-000000000001
```

**Quotas** :
- 40 cartes personnelles max
- 50 catégories personnelles max
- 10 profils enfants max
- 5 devices max
- ✅ Upload images (cartes personnelles)
- ✅ Création séquences

---

### 👤 Compte Test Free

```
Email    : test-free@local.dev
Password : Test1234x
Statut   : free
UUID     : ffffffff-ffff-ffff-ffff-000000000001
```

**Quotas** :
- 5 cartes personnelles max
- 2 catégories personnelles max
- 2 profils enfants max
- 1 device max
- ❌ Upload images interdit (subscriber uniquement)
- ❌ Création séquences interdit (subscriber uniquement)

---

## 🚀 Utilisation

### Connexion automatique après reset

Les comptes sont **automatiquement créés** après chaque `pnpm db:reset`.

```bash
# Reset complet (migrations + seed)
pnpm db:reset

# → Les comptes admin et test-free sont créés automatiquement
```

### Connexion manuelle

1. Ouvrir http://localhost:3000/login
2. Entrer email + password (ci-dessus)
3. Cliquer "Se connecter"

---

## ⚙️ Configuration

### Activer/Désactiver le seed

Fichier : `supabase/config.toml`

```toml
[db.seed]
enabled = true              # ✅ Seed activé
sql_paths = ["./seed.sql"]  # Chemin vers le script
```

Pour désactiver le seed :
```toml
[db.seed]
enabled = false  # ❌ Seed désactivé
```

### Script seed

Fichier : `supabase/seed.sql`

Le script est **idempotent** :
- ✅ Peut être exécuté plusieurs fois sans erreur
- ✅ Détecte si les comptes existent déjà
- ✅ Affiche un message clair ("✅ créé" ou "⏭️ existe déjà")

---

## 🧪 Tests E2E

Les comptes seed sont également référencés dans les tests E2E.

Fichier : `tests/e2e/helpers/auth.ts`

```typescript
import { TEST_USERS } from 'tests/e2e/helpers/auth'

// Utiliser le compte admin
await loginAs(page, 'admin')

// Utiliser le compte free
await loginAs(page, 'free')
```

**Note** : Les tests E2E utilisent des comptes différents :
- `test-admin@appli-picto.test`
- `test-free@appli-picto.test`

Ces comptes E2E doivent être créés manuellement via l'UI ou via helpers.

---

## 🔒 Sécurité

### ⚠️ CRITIQUE : Environnement local uniquement

Ces comptes sont **UNIQUEMENT pour le développement local (Docker)**.

**Ils NE DOIVENT JAMAIS être utilisés en production.**

Protections :
- ✅ `seed.sql` commenté "DÉVELOPPEMENT LOCAL UNIQUEMENT"
- ✅ UUID fixes facilement identifiables :
  - Admin : `aaaaaaaa-aaaa-aaaa-aaaa-000000000001`
  - Subscriber : `bbbbbbbb-bbbb-bbbb-bbbb-000000000001`
  - Free : `ffffffff-ffff-ffff-ffff-000000000001`
- ✅ Mots de passe simples (volontairement publics)
- ⚠️ `supabase/seed.sql` **IGNORÉ** par défaut en production (config production différente)

---

## 🛠️ Maintenance

### Ajouter un nouveau compte de test

Éditer `supabase/seed.sql` et dupliquer le bloc `DO $$ ... END $$;` :

```sql
DO $$
DECLARE
  v_subscriber_user_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001';
  v_subscriber_email TEXT := 'test-subscriber@local.dev';
  v_subscriber_password TEXT := 'Test1234x';
  -- ...
BEGIN
  -- ... (copier la logique d'insertion)
END $$;
```

### Modifier les mots de passe

⚠️ Les mots de passe sont hashés avec `bcrypt` via `crypt(password, gen_salt('bf'))`.

Pour changer un mot de passe :
1. Éditer `supabase/seed.sql`
2. Modifier la variable `v_admin_password` ou `v_free_password`
3. Relancer `pnpm db:reset`

---

## 📝 Triggers automatiques

Lors de la création d'un compte via `seed.sql`, les triggers suivants s'exécutent **automatiquement** :

1. **Child Profile** : Création automatique d'un profil enfant "Mon enfant"
   - Trigger : `trigger_accounts_auto_create_first_child_profile`
   - Table : `child_profiles`

2. **Timeline** : Création automatique d'une timeline pour le profil
   - Trigger : `trigger_child_profiles_auto_create_timeline`
   - Table : `timelines`

3. **Catégorie Système** : Création catégorie "🌟 Toutes mes cartes"
   - Trigger : `trigger_accounts_seed_system_category`
   - Table : `categories`

4. **Préférences** : Création préférences par défaut
   - Trigger : `trg_platform_accounts_create_preferences`
   - Table : `account_preferences`

**Résultat** : Un compte seed est **immédiatement utilisable** après création (profil enfant + timeline + catégories prêts).

---

## 📚 Références

- Config seed : `supabase/config.toml` (ligne 31-33)
- Script seed : `supabase/seed.sql`
- Tests E2E : `tests/e2e/helpers/auth.ts`
- Migrations : `supabase/migrations/`

---

**Dernière mise à jour** : 2026-03-20
