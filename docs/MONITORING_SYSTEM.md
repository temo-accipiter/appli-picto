# Système de Monitoring Appli-Picto

Documentation complète du système de monitoring et d'observabilité mis en place pour Appli-Picto.

## Vue d'ensemble

Le système de monitoring couvre 5 aspects principaux :

1. **Error Tracking** (Sentry) - Capture et analyse des erreurs
2. **Analytics** (Google Analytics 4) - Comportement utilisateur RGPD-compliant
3. **Performance Monitoring** (Core Web Vitals) - Métriques de performance
4. **Alertes Automatiques** - Notifications en cas de problème
5. **Rapports Hebdomadaires** - Synthèse des métriques clés

---

## 1. Error Tracking avec Sentry

### Configuration

**Fichiers:**

- `src/config/sentry/index.ts` - Configuration principale
- `src/config/sentry/globalHandlers.ts` - Handlers d'erreurs globales
- `vite.config.ts` - Plugin Sentry pour upload de source maps

**Variables d'environnement:**

```bash
# .env
VITE_SENTRY_DSN=https://...@o...ingest.sentry.io/...
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production

# .env.production (CI/CD uniquement)
SENTRY_ORG=votre-org
SENTRY_PROJECT=appli-picto
SENTRY_AUTH_TOKEN=sntrys_...
```

### Fonctionnalités

✅ **Privacy-first:**

- Filtrage automatique des données sensibles (passwords, tokens, cookies)
- User ID hashé (SHA-256 + salt)
- Pas d'email envoyé par défaut

✅ **Capture automatique:**

- Erreurs React (via ErrorBoundary)
- Erreurs JavaScript non gérées (window.onerror)
- Promesses rejetées non gérées (unhandledrejection)

✅ **Performance Monitoring (optionnel):**

- Activé uniquement en production
- Sample rate configurable (défaut: 10% des transactions)
- Tracking des routes React Router

✅ **Source Maps:**

- Upload automatique en production via Vite plugin
- Nettoyage automatique après upload

### Utilisation

```typescript
import { captureError, captureMessage, setSentryUser } from '@/config/sentry'

// Capturer une erreur manuellement
try {
  // Code risqué
} catch (error) {
  captureError(error, { context: 'additional info' })
}

// Capturer un message
captureMessage('Événement important', 'info')

// Définir l'utilisateur (automatique via AuthContext)
setSentryUser({ id: '123', role: 'admin' })
```

### Configuration Sentry Dashboard

1. Créer un projet Sentry sur https://sentry.io
2. Récupérer le DSN
3. Créer un auth token pour CI/CD (Settings > Auth Tokens)
4. Configurer les variables d'environnement

---

## 2. Analytics avec Google Analytics 4

### Configuration

**Fichiers:**

- `src/config/analytics/index.ts` - Initialisation GA4
- `src/config/analytics/routePageViews.ts` - Tracking automatique des pages
- `src/config/analytics/userProps.ts` - Propriétés utilisateur

**Variables d'environnement:**

```bash
VITE_GA4_ID=G-XXXXXXXXXX
VITE_GA_SALT=salt-random-pour-hash
```

### Conformité RGPD

✅ Consentement obligatoire (via CookieBanner)
✅ `anonymize_ip: true`
✅ Pas de `allow_google_signals`
✅ User ID hashé (SHA-256)
✅ Pas d'envoi d'email ou PII

### Événements trackés automatiquement

- `page_view` - Changements de route
- `view_pricing` - Visite page abonnement
- `start_checkout` - Création session Stripe
- `subscription_success` - Succès paiement

### Core Web Vitals envoyés à GA4

- LCP (Largest Contentful Paint)
- FID/INP (First Input Delay / Interaction to Next Paint)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)

**Voir les données:** Google Analytics > Events > `web-vitals-*`

---

## 3. Core Web Vitals Tracking

### Configuration

**Fichiers:**

- `src/components/shared/web-vitals/WebVitals.tsx`

**Dépendance:**

```bash
yarn add web-vitals
```

### Métriques collectées

| Métrique    | Seuil Good      | Seuil Poor      | Description                               |
| ----------- | --------------- | --------------- | ----------------------------------------- |
| **LCP**     | ≤ 2.5s          | > 4s            | Temps de chargement du plus grand élément |
| **FID/INP** | ≤ 100ms / 200ms | > 300ms / 500ms | Latence de la première interaction        |
| **CLS**     | ≤ 0.1           | > 0.25          | Stabilité visuelle (layout shifts)        |
| **FCP**     | ≤ 1.8s          | > 3s            | Temps avant le premier rendu              |
| **TTFB**    | ≤ 800ms         | > 1.8s          | Temps de réponse serveur                  |

### Destinations

Les métriques sont envoyées à :

1. **Google Analytics 4** (événements custom)
2. **Sentry** (si performance monitoring activé)
3. **Console** (en développement)

### Intégration

Le composant `<WebVitals />` est monté automatiquement dans `main.tsx`.

---

## 4. Alertes Automatiques

### Edge Function: monitoring-alerts

**Emplacement:** `supabase/functions/monitoring-alerts/`

**Fonctionnalités:**

- ✅ Détection d'erreurs critiques (webhooks, images)
- ✅ Surveillance des quotas dépassés
- ✅ Health check système
- ✅ Notifications Slack
- ✅ Notifications Email (SendGrid)

### Configuration

**Variables d'environnement (Supabase secrets):**

```bash
# Slack (optionnel)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# SendGrid (optionnel)
SENDGRID_API_KEY=SG....
ALERT_EMAIL=admin@appli-picto.fr
ALERT_FROM_EMAIL=alerts@appli-picto.fr
```

**Configurer les secrets:**

```bash
yarn supabase functions deploy monitoring-alerts
yarn supabase secrets set SLACK_WEBHOOK_URL=https://...
yarn supabase secrets set SENDGRID_API_KEY=SG...
yarn supabase secrets set ALERT_EMAIL=admin@example.com
```

### Déclenchement automatique

**Option 1: Cron job GitHub Actions**

Créer `.github/workflows/monitoring-alerts.yml`:

```yaml
name: Monitoring Alerts
on:
  schedule:
    - cron: '0 * * * *' # Toutes les heures
  workflow_dispatch:

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger alerts check
        run: |
          curl -X POST \
            https://tklcztqoqvnialaqfcjm.supabase.co/functions/v1/monitoring-alerts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

**Option 2: Service externe (cron-job.org, EasyCron)**

Créer un cron job qui appelle l'URL de la fonction toutes les heures.

### Seuils configurables

```typescript
// Par défaut
{
  errorThreshold: 5,      // 5 erreurs max
  periodMinutes: 60,      // dans les 60 dernières minutes
  quotaThreshold: 90      // 90% de quota
}

// Custom via body
POST /monitoring-alerts
{
  "config": {
    "errorThreshold": 3,
    "periodMinutes": 30
  }
}
```

---

## 5. Rapports Hebdomadaires

### Edge Function: weekly-report

**Emplacement:** `supabase/functions/weekly-report/`

**Contenu du rapport:**

- 👥 Utilisateurs (total, nouveaux, actifs)
- 💳 Abonnements (actifs, nouveaux, annulés)
- 🖼️ Images (uploads, compression, stockage)
- ⚠️ Erreurs (webhooks, images)

### Configuration

**Variables d'environnement:**

```bash
SENDGRID_API_KEY=SG...
REPORT_FROM_EMAIL=reports@appli-picto.fr
REPORT_RECIPIENTS=admin@example.com,team@example.com
```

**Configurer les secrets:**

```bash
yarn supabase functions deploy weekly-report
yarn supabase secrets set REPORT_RECIPIENTS=admin@example.com,team@example.com
```

### Déclenchement automatique

**GitHub Actions cron (recommandé):**

Créer `.github/workflows/weekly-report.yml`:

```yaml
name: Weekly Report
on:
  schedule:
    - cron: '0 9 * * 1' # Tous les lundis à 9h
  workflow_dispatch:

jobs:
  send-report:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger weekly report
        run: |
          curl -X POST \
            https://tklcztqoqvnialaqfcjm.supabase.co/functions/v1/weekly-report \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### Test manuel

```bash
curl -X POST https://tklcztqoqvnialaqfcjm.supabase.co/functions/v1/weekly-report \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recipients": ["test@example.com"]}'
```

---

## 6. Dashboard Admin

### Page: /admin/metrics

**Composants:**

- `src/components/features/admin/MetricsDashboard.tsx`
- `src/pages/admin/metrics/Metrics.tsx`

**Accès:** Réservé aux utilisateurs avec rôle `admin`

**URL:** https://appli-picto.fr/admin/metrics

### Métriques affichées

**Santé Système:**

- Score de santé (0-100%)
- Temps de réponse moyen

**Utilisateurs:**

- Total utilisateurs
- Nouveaux (7j)
- Actifs (7j)

**Abonnements:**

- Actifs
- Nouveaux (7j)
- Annulés (7j)

**Images:**

- Uploads (7j)
- Taux de succès
- Stockage économisé

**Erreurs:**

- Erreurs webhooks (7j)
- Erreurs images (7j)

### Rafraîchissement

- Automatique toutes les 5 minutes
- Manuel via bouton 🔄

---

## 7. Vues SQL et Métriques Agrégées

### Migration

**Fichier:** `supabase/migrations/20250109_monitoring_views.sql`

**Vues créées:**

1. `weekly_user_stats` - Stats utilisateurs
2. `subscription_stats` - Stats abonnements
3. `recent_errors` - Erreurs récentes agrégées
4. `weekly_image_stats` - Stats images
5. `system_health` - Score de santé système

**Fonction RPC:**

```sql
SELECT * FROM get_dashboard_metrics();
```

Retourne toutes les métriques en une seule requête (JSON).

### Appliquer la migration

```bash
# En local
yarn supabase migration up

# En production
yarn supabase db push
```

---

## 8. Checklist de Déploiement

### Avant le déploiement

- [ ] Configurer `VITE_SENTRY_DSN` dans `.env`
- [ ] Configurer `VITE_GA4_ID` (déjà fait)
- [ ] Créer auth token Sentry pour CI/CD
- [ ] Ajouter `SENTRY_*` dans secrets GitHub Actions

### Edge Functions

- [ ] Déployer `monitoring-alerts`
- [ ] Déployer `weekly-report`
- [ ] Configurer secrets Supabase (Slack, SendGrid)
- [ ] Tester les fonctions manuellement

### Cron Jobs

- [ ] Créer workflow `.github/workflows/monitoring-alerts.yml`
- [ ] Créer workflow `.github/workflows/weekly-report.yml`
- [ ] Vérifier que les secrets GitHub sont configurés

### Base de données

- [ ] Appliquer migration `20250109_monitoring_views.sql`
- [ ] Vérifier les permissions RLS sur les nouvelles vues
- [ ] Tester la fonction `get_dashboard_metrics()`

### Tests

- [ ] Vérifier dashboard `/admin/metrics`
- [ ] Déclencher une erreur test pour Sentry
- [ ] Vérifier les Core Web Vitals dans GA4
- [ ] Tester alerte manuelle
- [ ] Tester rapport hebdomadaire manuel

---

## 9. Surveillance des Logs

### Sentry

https://sentry.io/organizations/YOUR_ORG/projects/

**Filtres utiles:**

- Environnement: `production`
- Niveau: `error`, `warning`
- User: Rechercher par rôle

### Google Analytics 4

https://analytics.google.com/

**Rapports utiles:**

- Events > `page_view`, `start_checkout`, `subscription_success`
- Events > `web-vitals-*` (LCP, FID, CLS, etc.)
- User Properties > `customer_tier`, `plan_name`

### Supabase Edge Functions

```bash
# Monitoring alerts
yarn supabase functions logs monitoring-alerts --follow

# Weekly report
yarn supabase functions logs weekly-report --follow
```

### Dashboard Admin

https://appli-picto.fr/admin/metrics

- Rafraîchissement automatique toutes les 5 minutes
- Vue en temps réel des métriques clés

---

## 10. Troubleshooting

### Sentry ne reçoit pas d'erreurs

1. Vérifier que `VITE_SENTRY_DSN` est configuré
2. Vérifier la console: `✅ Sentry initialisé avec succès`
3. Tester manuellement: `captureError(new Error('Test'))`
4. Vérifier les filtres dans `beforeSend` (peut bloquer certaines erreurs)

### Core Web Vitals non visibles dans GA4

1. Attendre 24-48h (données pas en temps réel)
2. Vérifier Events > All events > Chercher `LCP`, `FID`, `CLS`
3. Vérifier que le consentement cookies est donné
4. Vérifier console: `📊 Core Web Vitals tracking activé`

### Alertes non reçues

1. Vérifier que les secrets sont configurés: `yarn supabase secrets list`
2. Vérifier les logs: `yarn supabase functions logs monitoring-alerts`
3. Tester manuellement la fonction
4. Vérifier Slack webhook / SendGrid API key

### Dashboard admin vide

1. Vérifier que l'utilisateur a le rôle `admin`
2. Vérifier les permissions RLS sur les tables
3. Vérifier les logs console pour erreurs
4. Vérifier que la migration `20250109_monitoring_views.sql` est appliquée

---

## 11. Coûts et Quotas

### Sentry

- **Free tier:** 5 000 événements/mois
- **Recommandation:** Team ($26/mois) si > 5k erreurs/mois

### Google Analytics 4

- **Gratuit** (illimité)

### SendGrid

- **Free tier:** 100 emails/jour
- **Recommandation:** Essentials ($19.95/mois) si > 100/jour

### Slack

- **Gratuit** (webhooks illimités)

### Supabase

- **Free tier:** 500 000 requêtes Edge Functions/mois
- Alertes horaires: ~720 requêtes/mois
- Rapport hebdomadaire: ~4 requêtes/mois
- **Total:** < 1 000 requêtes/mois ✅

---

## 12. Ressources

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Core Web Vitals](https://web.dev/vitals/)
- [GA4 Custom Events](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [SendGrid API](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)

---

## Support

Pour toute question ou problème, consulter :

- `/docs/SUPABASE_HEALTH_CHECK.md` - Health check système
- `/supabase/functions/monitoring-alerts/README.md` - Guide alertes
- GitHub Issues : https://github.com/temo-accipiter/appli-picto/issues
