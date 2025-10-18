# Guide d'utilisation de l'internationalisation (i18n)

L'application Appli-Picto est maintenant configurée pour supporter plusieurs langues grâce à **i18next** et **react-i18next**.

## 📁 Structure

```
public/locales/
├── fr/
│   └── common.json   # Traductions françaises
└── en/
    └── common.json   # Traductions anglaises

src/
├── config/i18n/
│   └── i18n.js       # Configuration i18next
└── hooks/
    └── useI18n.js    # Hook personnalisé pour l'i18n
```

## 🚀 Utilisation de base

### 1. Importer le hook

```jsx
import { useI18n } from '@/hooks'
```

### 2. Utiliser dans un composant

```jsx
function MonComposant() {
  const { t, language, changeLanguage } = useI18n()

  return (
    <div>
      <h1>{t('app.welcome')}</h1>
      <p>Langue actuelle : {language}</p>
      <button onClick={() => changeLanguage('en')}>English</button>
    </div>
  )
}
```

## 🌐 API du hook `useI18n`

Le hook retourne un objet avec :

- **`t(key)`** : Fonction de traduction
  - Exemple : `t('nav.login')` → "Se connecter" (fr) ou "Log in" (en)

- **`language`** : Langue actuelle (`'fr'` | `'en'`)

- **`changeLanguage(lng)`** : Changer de langue
  - Exemple : `changeLanguage('en')`
  - La langue est automatiquement sauvegardée dans le localStorage

- **`isReady`** : Boolean indiquant si les traductions sont chargées

- **`languages`** : Array des langues supportées (`['fr', 'en']`)

## 📝 Structure des traductions

Les traductions sont organisées par catégories dans `public/locales/{lang}/common.json` :

```json
{
  "app": {
    "title": "Appli Picto",
    "welcome": "Bienvenue sur ton tableau magique !"
  },
  "nav": {
    "tableau": "Tableau",
    "edition": "Édition",
    "login": "Se connecter"
  },
  "actions": {
    "add": "Ajouter",
    "save": "Enregistrer"
  }
}
```

### Catégories disponibles

- `app` - Application générale
- `nav` - Navigation
- `actions` - Actions (boutons)
- `tasks` - Tâches
- `rewards` - Récompenses
- `categories` - Catégories
- `settings` - Paramètres
- `subscription` - Abonnement
- `quota` - Quotas
- `auth` - Authentification
- `errors` - Messages d'erreur
- `legal` - Documents légaux
- `cookies` - Gestion des cookies
- `accessibility` - Accessibilité

## 🎯 Exemples d'utilisation

### Exemple 1 : Traduire un titre

```jsx
import { useI18n } from '@/hooks'

function Header() {
  const { t } = useI18n()

  return <h1>{t('app.welcome')}</h1>
}
```

### Exemple 2 : Bouton d'action

```jsx
import { useI18n } from '@/hooks'

function AddButton() {
  const { t } = useI18n()

  return (
    <button>
      {t('actions.add')}
    </button>
  )
}
```

### Exemple 3 : Navigation

```jsx
import { useI18n } from '@/hooks'
import { NavLink } from 'react-router-dom'

function Navigation() {
  const { t } = useI18n()

  return (
    <nav>
      <NavLink to="/tableau">{t('nav.tableau')}</NavLink>
      <NavLink to="/edition">{t('nav.edition')}</NavLink>
      <NavLink to="/profil">{t('nav.profil')}</NavLink>
    </nav>
  )
}
```

### Exemple 4 : Sélecteur de langue (déjà implémenté)

Le composant `LangSelector` est déjà intégré dans la Navbar :

```jsx
// src/components/shared/lang-selector/LangSelector.jsx
import { useTranslation } from 'react-i18next'

export default function LangSelector() {
  const { i18n } = useTranslation()

  const changeLanguage = lang => {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  return (
    <div className="lang-selector">
      <button onClick={() => changeLanguage('fr')}>🇫🇷</button>
      <button onClick={() => changeLanguage('en')}>🇬🇧</button>
    </div>
  )
}
```

## ⚙️ Configuration

### Détection automatique de la langue

La langue est détectée dans cet ordre :

1. **localStorage** (`lang` key)
2. **Langue du navigateur** (premier segment de `navigator.language`)
3. **Français** (fallback par défaut)

### Sauvegarde automatique

Quand l'utilisateur change de langue :
- La langue est sauvegardée dans le localStorage
- L'attribut `lang` de la page HTML est mis à jour (accessibilité)

### Debugging

Pour activer les logs de debug i18n en développement :

```bash
# .env
VITE_I18N_DEBUG=true
```

## 🧪 Tester l'intégration

Un composant d'exemple est disponible pour tester toutes les fonctionnalités :

```jsx
// src/components/examples/I18nExample.jsx
import I18nExample from '@/components/examples/I18nExample'

// Utiliser dans une route ou une page pour tester
<I18nExample />
```

Pour le visualiser, ajoutez temporairement cette route dans `main.jsx` :

```jsx
{ path: '/test-i18n', element: <I18nExample /> }
```

Puis accédez à http://localhost:5173/test-i18n

## 📚 Ajouter de nouvelles traductions

### 1. Ajouter dans les fichiers JSON

**public/locales/fr/common.json**
```json
{
  "myNewSection": {
    "title": "Mon nouveau titre",
    "description": "Ma description"
  }
}
```

**public/locales/en/common.json**
```json
{
  "myNewSection": {
    "title": "My new title",
    "description": "My description"
  }
}
```

### 2. Utiliser dans un composant

```jsx
const { t } = useI18n()

return (
  <div>
    <h2>{t('myNewSection.title')}</h2>
    <p>{t('myNewSection.description')}</p>
  </div>
)
```

## 🔍 Bonnes pratiques

1. **Toujours utiliser des clés descriptives**
   - ✅ `t('auth.loginSuccess')`
   - ❌ `t('msg1')`

2. **Organiser par domaine fonctionnel**
   - Regrouper les traductions liées ensemble
   - Utiliser des objets imbriqués pour la structure

3. **Maintenir la parité entre les langues**
   - Toutes les clés doivent exister dans toutes les langues
   - Utiliser le même niveau d'imbrication

4. **Éviter les textes codés en dur**
   - ✅ `{t('actions.save')}`
   - ❌ `"Enregistrer"`

5. **Accessibilité**
   - Les attributs `aria-label` doivent aussi être traduits
   - Exemple : `aria-label={t('accessibility.closeMenu')}`

## 🌍 Langues supportées

Actuellement :
- 🇫🇷 Français (`fr`) - langue par défaut
- 🇬🇧 Anglais (`en`)

Pour ajouter une nouvelle langue :

1. Créer `public/locales/{lang}/common.json`
2. Ajouter la langue dans `supportedLngs` dans `src/config/i18n/i18n.js`
3. Mettre à jour le hook `useI18n.js` avec la nouvelle langue
4. Ajouter un bouton dans `LangSelector.jsx`

## 🚨 Dépannage

### Les traductions ne s'affichent pas

1. Vérifier que les fichiers JSON sont bien dans `public/locales/`
2. Vérifier la console pour les erreurs de chargement
3. Activer le debug : `VITE_I18N_DEBUG=true`

### Les changements de langue ne fonctionnent pas

1. Vérifier que le localStorage est accessible
2. Vérifier la console pour les erreurs
3. Nettoyer le localStorage : `localStorage.clear()`

### Clé de traduction manquante

Si une clé n'existe pas, i18next affiche la clé elle-même.
Exemple : Si `t('missing.key')` n'existe pas → affiche `"missing.key"`

## 📖 Ressources

- [Documentation i18next](https://www.i18next.com/)
- [Documentation react-i18next](https://react.i18next.com/)
- [Guide des bonnes pratiques i18n](https://www.i18next.com/principles/fallback)
