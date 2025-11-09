# Edge Function: monitoring-alerts

Fonction de surveillance et d'alertes automatiques pour Appli-Picto.

## Fonctionnalités

- ✅ Détection des erreurs critiques (webhooks, images, etc.)
- ✅ Surveillance des quotas dépassés
- ✅ Health check système
- ✅ Alertes via Slack webhook
- ✅ Alertes via email (SendGrid)

## Configuration

### Variables d'environnement requises

Dans `supabase/.env` (ou secrets Supabase):

```bash
# Obligatoires (déjà configurées)
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Optionnelles pour Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optionnelles pour email
SENDGRID_API_KEY=SG....
ALERT_EMAIL=admin@appli-picto.fr
ALERT_FROM_EMAIL=alerts@appli-picto.fr
```

### Configurer Slack webhook

1. Aller sur https://api.slack.com/messaging/webhooks
2. Créer une nouvelle app Slack
3. Activer "Incoming Webhooks"
4. Créer un webhook pour le channel désiré
5. Copier l'URL webhook dans `SLACK_WEBHOOK_URL`

### Configurer SendGrid email

1. Créer un compte SendGrid (free tier: 100 emails/jour)
2. Créer une API key avec permission "Mail Send"
3. Vérifier votre domaine ou email sender
4. Copier la clé dans `SENDGRID_API_KEY`

## Déploiement

```bash
# Déployer la fonction
yarn supabase functions deploy monitoring-alerts

# Configurer les secrets
yarn supabase secrets set SLACK_WEBHOOK_URL=https://...
yarn supabase secrets set SENDGRID_API_KEY=SG...
yarn supabase secrets set ALERT_EMAIL=admin@appli-picto.fr
```

## Utilisation

### Via cron job externe

Créer un workflow GitHub Actions (`.github/workflows/monitoring-alerts.yml`):

```yaml
name: Monitoring Alerts

on:
  schedule:
    # Toutes les heures
    - cron: '0 * * * *'
  workflow_dispatch: # Permet déclenchement manuel

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger monitoring alerts
        run: |
          curl -X POST \
            https://tklcztqoqvnialaqfcjm.supabase.co/functions/v1/monitoring-alerts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

### Via trigger Supabase (avancé)

Créer un trigger SQL qui appelle la fonction sur certains événements:

```sql
-- Trigger sur erreur webhook
CREATE OR REPLACE FUNCTION trigger_monitoring_alert()
RETURNS trigger AS $$
BEGIN
  -- Appeler l'Edge Function via pg_net (extension Supabase)
  PERFORM net.http_post(
    url := 'https://tklcztqoqvnialaqfcjm.supabase.co/functions/v1/monitoring-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.anon_key'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_webhook_error
AFTER INSERT ON subscription_logs
FOR EACH ROW
WHEN (NEW.event_type = 'webhook.error')
EXECUTE FUNCTION trigger_monitoring_alert();
```

### Test manuel

```bash
# Test simple
curl -X POST https://tklcztqoqvnialaqfcjm.supabase.co/functions/v1/monitoring-alerts \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test avec configuration custom
curl -X POST https://tklcztqoqvnialaqfcjm.supabase.co/functions/v1/monitoring-alerts \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "errorThreshold": 3,
      "periodMinutes": 30,
      "quotaThreshold": 85
    }
  }'
```

## Configuration des seuils

Par défaut:

- `errorThreshold`: 5 erreurs
- `periodMinutes`: 60 minutes
- `quotaThreshold`: 90% de quota

Vous pouvez les modifier en passant un objet `config` dans le body de la requête.

## Réponse

```json
{
  "success": true,
  "alerts": 2,
  "checks": {
    "errors": true,
    "quotas": false,
    "health": true
  },
  "messages": [
    "⚠️ 5 erreurs webhook détectées dans les 60 dernières minutes",
    "❌ Problème de connectivité Supabase détecté"
  ]
}
```

## Surveillance des logs

```bash
# Suivre les logs en temps réel
yarn supabase functions logs monitoring-alerts --follow
```
