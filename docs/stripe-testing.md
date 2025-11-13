# 💳 Tests Stripe - Guide complet

Guide pour tester l'intégration Stripe en local et dans les tests automatisés.

## 📋 Prérequis

- **Compte Stripe** en mode test (gratuit)
- **Stripe CLI** installé : [Installation](https://stripe.com/docs/stripe-cli)
- **Clés API Stripe** en test mode (disponibles sur le Dashboard Stripe)

## 🔑 Configuration

### 1. Obtenir les clés de test

1. Aller sur https://dashboard.stripe.com/test/apikeys
2. Copier la **Publishable key** (commence par `pk_test_...`)
3. Copier la **Secret key** (commence par `sk_test_...`)

### 2. Configurer `.env.test`

Ajouter ces variables dans `.env.test` :

```env
# Stripe Test Mode
VITE_STRIPE_PUBLIC_KEY=pk_test_51234567890abcdefghijklmnopqrstuvwxyz
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqrstuvwxyz
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdefghijklmnopqrstuvwxyz
```

### 3. Installer Stripe CLI

**macOS** (Homebrew) :

```bash
brew install stripe/stripe-cli/stripe
```

**Windows** (Scoop) :

```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Linux** :

```bash
# Via script d'installation
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

### 4. Authentifier Stripe CLI

```bash
stripe login
```

Une page web s'ouvrira pour autoriser l'accès.

## 🧪 Types de tests

### 1️⃣ Tests unitaires avec mocks

Pour les tests unitaires, utiliser les **mocks Stripe** :

```typescript
import {
  mockStripeAPI,
  mockStripeCheckoutSession,
} from '@/tests/helpers/stripe-mock'

describe('Stripe Integration', () => {
  it('should create checkout session', async () => {
    const stripe = mockStripeAPI()

    stripe.checkout.sessions.create.mockResolvedValue(mockStripeCheckoutSession)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // ... autres options
    })

    expect(session.id).toBe('cs_test_123456789')
  })
})
```

### 2️⃣ Tests d'intégration avec Stripe Test Mode

Pour les tests d'intégration, utiliser les **vraies API Stripe en test mode** :

```typescript
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

test('create real checkout session', async () => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: 'price_test_123', // Votre Price ID de test
        quantity: 1,
      },
    ],
    success_url: 'http://localhost:5173/success',
    cancel_url: 'http://localhost:5173/cancel',
  })

  expect(session.url).toBeDefined()
})
```

### 3️⃣ Tests E2E avec webhooks locaux

Pour tester les webhooks en local :

#### Étape 1 : Démarrer l'écoute des webhooks

Terminal 1 :

```bash
yarn stripe:listen
```

Vous obtiendrez un **webhook secret** (commence par `whsec_...`). Copiez-le dans `.env.test`.

#### Étape 2 : Démarrer votre serveur local

Terminal 2 :

```bash
# Démarrer Supabase Local (pour les edge functions)
yarn supabase:start

# Servir les edge functions
yarn supabase:serve
```

#### Étape 3 : Déclencher des événements de test

Terminal 3 :

```bash
# Simuler un checkout complété
yarn stripe:trigger:checkout

# Simuler une création d'abonnement
yarn stripe:trigger:subscription
```

Les webhooks seront automatiquement envoyés à votre endpoint local !

## 🎯 Scénarios de test communs

### Test 1 : Créer un checkout session

```typescript
test('user can start checkout', async ({ page }) => {
  await page.goto('/abonnement')
  await page.click('button:has-text("S\'abonner")')

  // Attendre la redirection vers Stripe
  await page.waitForURL(/checkout.stripe.com/)
})
```

### Test 2 : Webhook subscription created

```bash
# Déclencher l'événement
stripe trigger customer.subscription.created

# Vérifier dans Supabase Studio que l'abonnement a été créé
```

### Test 3 : Annuler un abonnement

```typescript
test('user can cancel subscription', async () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  // Créer un abonnement
  const subscription = await stripe.subscriptions.create({
    customer: 'cus_test_123',
    items: [{ price: 'price_test_123' }],
  })

  // Annuler
  const canceled = await stripe.subscriptions.cancel(subscription.id)

  expect(canceled.status).toBe('canceled')
})
```

## 🧰 Helpers disponibles

### Mocks Stripe (`tests/helpers/stripe-mock.ts`)

```typescript
import {
  mockStripeCustomer,
  mockStripeSubscriptionActive,
  mockStripeCheckoutSession,
  mockWebhookSubscriptionCreated,
  mockStripeAPI,
} from '@/tests/helpers/stripe-mock'
```

### Fonctions utiles

| Helper                           | Description                  |
| -------------------------------- | ---------------------------- |
| `mockStripeAPI()`                | Mock complet de l'API Stripe |
| `mockStripeCustomer`             | Objet Customer mocké         |
| `mockStripeSubscriptionActive`   | Abonnement actif mocké       |
| `mockStripeCheckoutSession`      | Session checkout mockée      |
| `mockWebhookSubscriptionCreated` | Événement webhook mocké      |

## 📊 Stripe Dashboard de test

**URL** : https://dashboard.stripe.com/test

Vous pouvez :

- ✅ Voir les paiements de test
- ✅ Voir les abonnements créés
- ✅ Déclencher manuellement des webhooks
- ✅ Voir les logs des webhooks
- ✅ Tester les cartes de test

### Cartes de test utiles

| Numéro                | Description                        |
| --------------------- | ---------------------------------- |
| `4242 4242 4242 4242` | Paiement réussi                    |
| `4000 0000 0000 0002` | Carte refusée                      |
| `4000 0000 0000 9995` | Fonds insuffisants                 |
| `4000 0025 0000 3155` | Authentification 3D Secure requise |

**Dates d'expiration** : N'importe quelle date future (ex: 12/34)
**CVV** : N'importe quel 3 chiffres (ex: 123)

## 🔄 Scripts disponibles

| Script                             | Description                           |
| ---------------------------------- | ------------------------------------- |
| `yarn stripe:listen`               | Écouter les webhooks localement       |
| `yarn stripe:trigger:checkout`     | Simuler checkout.session.completed    |
| `yarn stripe:trigger:subscription` | Simuler customer.subscription.created |

## 🐛 Dépannage

### Erreur "Invalid API Key"

```bash
# Vérifier que vous utilisez la clé de TEST (commence par sk_test_)
echo $STRIPE_SECRET_KEY

# Regénérer une clé si nécessaire sur le Dashboard Stripe
```

### Webhook non reçu

```bash
# Vérifier que stripe:listen est bien actif
# Vérifier que l'URL de forward est correcte
# Vérifier les logs dans le terminal stripe:listen
```

### Erreur "No such price"

```bash
# Créer un prix de test sur le Dashboard Stripe
# Utiliser un Price ID de test (commence par price_test_)
```

### Tests qui échouent aléatoirement

Les appels à l'API Stripe peuvent être lents. Augmenter les timeouts :

```typescript
test('stripe test', async () => {
  // ...
}, 30000) // 30 secondes au lieu de 5
```

## 🔐 Sécurité

⚠️ **IMPORTANT** :

- ✅ Toujours utiliser les clés **TEST** (`pk_test_...`, `sk_test_...`)
- ❌ JAMAIS commiter les clés dans Git
- ❌ JAMAIS utiliser les clés de production dans les tests
- ✅ Les clés de test sont dans `.env.test` (gitignored)

## 📚 Ressources

- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)

## ✅ Checklist avant les tests

- [ ] Stripe CLI installé et authentifié
- [ ] Clés de test configurées dans `.env.test`
- [ ] `yarn stripe:listen` actif (pour tests webhooks)
- [ ] Supabase Local démarré (pour edge functions)
- [ ] Prix de test créé sur le Dashboard Stripe

---

**Dernière mise à jour** : Phase 4 - Fondations de tests
