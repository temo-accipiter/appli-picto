# 📧 Templates d'emails Supabase (Bilingues FR/EN)

Ce dossier contient les templates HTML d'emails bilingues (français + anglais) pour Supabase Auth.

## 📋 Templates disponibles

### 1. **confirm-signup.html** - Confirmation d'inscription

Envoyé lorsqu'un utilisateur crée un compte pour vérifier son adresse email.

### 2. **reset-password.html** - Réinitialisation de mot de passe

Envoyé lorsqu'un utilisateur demande à réinitialiser son mot de passe.

### 3. **invite-user.html** - Invitation utilisateur (optionnel)

Envoyé lorsqu'un administrateur invite un nouvel utilisateur.

---

## 🔧 Configuration dans Supabase Dashboard

### Étape 1 : Accéder aux paramètres d'email

1. Connectez-vous au [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **Appli-Picto**
3. Allez dans **Authentication** > **Email Templates** (dans le menu latéral)

### Étape 2 : Configurer chaque template

Pour chaque type d'email :

#### A. Confirmation d'inscription (Confirm signup)

1. Cliquez sur **"Confirm signup"** dans la liste
2. Copiez le contenu de `confirm-signup.html`
3. Collez-le dans l'éditeur HTML
4. **Important** : Vérifiez que la variable `{{ .ConfirmationURL }}` est bien présente
5. Cliquez sur **"Save"**

#### B. Réinitialisation de mot de passe (Reset password)

1. Cliquez sur **"Reset password"** dans la liste
2. Copiez le contenu de `reset-password.html`
3. Collez-le dans l'éditeur HTML
4. **Important** : Vérifiez que la variable `{{ .ConfirmationURL }}` est bien présente
5. Cliquez sur **"Save"**

#### C. Invitation utilisateur (Invite user) - OPTIONNEL

1. Cliquez sur **"Invite user"** dans la liste
2. Copiez le contenu de `invite-user.html`
3. Collez-le dans l'éditeur HTML
4. **Important** : Vérifiez que la variable `{{ .ConfirmationURL }}` est bien présente
5. Cliquez sur **"Save"**

---

## 📝 Variables Supabase disponibles

Les templates peuvent utiliser les variables suivantes :

- `{{ .ConfirmationURL }}` - URL de confirmation (OBLIGATOIRE)
- `{{ .Token }}` - Token de confirmation
- `{{ .TokenHash }}` - Hash du token
- `{{ .SiteURL }}` - URL du site configurée dans Supabase
- `{{ .Email }}` - Email de l'utilisateur

**⚠️ IMPORTANT** : La variable `{{ .ConfirmationURL }}` doit TOUJOURS être présente dans le template, sinon l'email ne fonctionnera pas !

---

## 🎨 Personnalisation

Vous pouvez personnaliser les templates :

### Changer les couleurs

Dans la section `<style>`, modifiez :

- `#2563eb` (bleu principal) - Couleur des titres et boutons
- `#1d4ed8` (bleu hover) - Couleur au survol des boutons

### Changer le logo

Dans la section `.logo`, remplacez :

```html
<h1>🎨 Appli-Picto</h1>
```

Par une image :

```html
<img
  src="https://votre-domaine.com/logo.png"
  alt="Appli-Picto"
  style="max-width: 200px;"
/>
```

### Modifier les textes

Vous pouvez modifier n'importe quel texte dans les sections :

- Section française : `<div class="section">` avec `🇫🇷 Français`
- Section anglaise : `<div class="section">` avec `🇬🇧 English`

---

## ✅ Tester les emails

### En développement (local)

1. Configurez Supabase avec **"Disable email confirmations"** dans les paramètres Auth
2. Les emails ne seront pas envoyés, mais vous pourrez tester l'inscription

### En production

1. Activez **"Enable email confirmations"**
2. Créez un compte de test avec votre email
3. Vérifiez la réception de l'email de confirmation
4. Testez la réinitialisation de mot de passe

### Envoyer un email de test

Dans le Dashboard Supabase :

1. Allez dans **Authentication** > **Email Templates**
2. Cliquez sur le template que vous voulez tester
3. Cliquez sur **"Send test email"**
4. Entrez votre adresse email
5. Vérifiez votre boîte de réception

---

## 🌍 Pourquoi des templates bilingues ?

Supabase ne supporte **pas nativement** le changement de langue des emails basé sur les préférences utilisateur. Les templates sont **globaux** pour tout le projet.

**Solutions alternatives** :

- ✅ **Templates bilingues** (solution actuelle) - Simple et robuste
- ❌ **Edge Function personnalisée** - Complexe à maintenir
- ❌ **Deux projets Supabase** - Coûteux et compliqué

Les templates bilingues sont le meilleur compromis : tous les utilisateurs (français et anglais) reçoivent un email clair dans leur langue.

---

## 🔒 Sécurité

- ✅ Les templates utilisent des URLs de confirmation uniques et sécurisées
- ✅ Les liens expirent automatiquement (24h pour confirmation, 1h pour reset password)
- ✅ Les emails ne contiennent aucune information sensible
- ✅ Compatible RGPD/CNIL

---

## 📞 Support

Si vous rencontrez des problèmes avec les emails :

1. Vérifiez que les templates sont correctement sauvegardés dans Supabase
2. Vérifiez les logs dans **Supabase Dashboard** > **Logs** > **Auth Logs**
3. Testez avec un email personnel pour voir si l'email arrive
4. Vérifiez vos **spams**

---

## 📚 Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Email Templates Supabase](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Variables disponibles](https://supabase.com/docs/guides/auth/auth-email-templates#variables)
