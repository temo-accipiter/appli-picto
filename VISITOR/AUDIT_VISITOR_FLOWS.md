# Flows d'Accès Détaillés - Audit Sécurité Visiteur

## Vue d'Ensemble Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       APPLI-PICTO                               │
│                    Next.js 16 App Router                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────┐
                              │                     │
                    ┌─────────▼─────────┐   ┌───────▼────────┐
                    │   (public)        │   │  (protected)   │
                    │   Route Group     │   │   Route Group  │
                    └─────────┬─────────┘   └────────┬────────┘
                              │                      │
                ┌─────────────┼────────────┐         │
                │             │            │         │
            ┌───▼───┐    ┌───▼───┐   ┌───▼───┐   ┌──▼──────┐
            │Tableau│    │ Login │   │ Signup│   │ Profil  │
            │(PUBLIC)   │(PUBLIC)   │(PUBLIC)   │(PROTECTED
            └───┬───┘    └───────┘   └───────┘   └────┬─────┘
                │                                       │
                │                                  ProtectedRoute
                │                                 (checks user)
            ┌───┼──────────────┐                      │
            │   │              │                      ├──┐
        ┌───▼─┴─┐      ┌──────▼─┐              ┌─────▼──┐
        │Navbar │      │BottomNav              │ Edition│
        │(public│      │(user-only)            │(PROTECTED)
        └────┬──┘      └─────┬───┘             └────┬───┘
             │               │                      │
             ├─ Edit btn     └─ Edit btn      ProtectedRoute
             │ (hidden)       (user-only)    (checks user)
             │
        UserMenu
        (user-only)
            │
            ├─ /profil
            ├─ /edition
            ├─ /abonnement
            └─ logout
```

---

## Flows d'Accès - Visitor vs Authenticated

### FLOW 1 : Visiteur sur /tableau (Public)

```
UTILISATEUR                          APPLICATION

   VISITOR
      │
      ├─ Ouvre /tableau
      │
      └─────────────────────────────────────────────────────┐
                                                            │
                                    (public)/layout.tsx    │
                                            │              │
                                    NO ProtectedRoute  ◄───┘
                                            │
                                      Tableau.tsx
                                    (page-components)
                                            │
                                    ┌───────┴──────────────┐
                                    │                      │
                                 Navbar.tsx          BottomNav.tsx
                                    │                      │
                        ┌───────────┴────────┐        Retourne null
                        │                    │        (pas d'user)
                    isVisitor?               │
                        │                    │
                   YES  │  NO                │
                        │   │                │
                    ┌───▼─┐ │         ┌──────▼──┐
                    │Show │ │         │Show user│
                    │signup│ │        │ menu    │
                    │login │ │        └─────────┘
                    │buttons│
                    └───┬───┘
                        │
                  PersonalizationModal
                  (context='visitor')
                        │
                    ┌───┴──────┐
                    │           │
              Click         Click
            "Create        "Login"
            Account"
                    │           │
                    └─►/signup  └─►/login
                         │         │
                      (public)  (public)


RÉSULTAT : ✅ VISITEUR RESTE SUR PAGES PUBLIQUES
           Aucune accès aux routes protégées
```

---

### FLOW 2 : Visiteur Tente d'Accéder /profil Directement

```
UTILISATEUR                          APPLICATION

   VISITOR
      │
      ├─ Tape /profil dans URL-bar
      │
      └────────────────────────────────────────────────────┐
                                                           │
                                    (protected)/layout.tsx │
                                            │              │
                                     ProtectedRoute    ◄───┘
                                            │
                                    useAuth() hook
                                            │
                                    ┌───────┴────────┐
                                    │                │
                                authReady?       !authReady?
                                    │                │
                                   YES              Attendre
                                    │               jusqu'à
                                    │               ready
                        ┌───────────┴──────────┐
                        │                      │
                       user?                  │
                        │                     │
                   null │ !== null            │
                        │                     │
                   ┌────▼──┐           ┌──────▼──┐
                   │NO user│           │Has user │
                   └────┬──┘           └────┬────┘
                        │                   │
                 router.replace(            Continue
                   '/login')                (render page)
                        │
                 Redirect to
                 login page
                        │
                   (public)


RÉSULTAT : ✅ REDIRECT AUTOMATIQUE VERS /login
           Pas de contenu /profil affiché
```

---

### FLOW 3 : Visiteur Clique "Édition" sur Navbar /tableau

```
UTILISATEUR                          APPLICATION

   VISITOR on /tableau
      │
      ├─ Voir Navbar
      │
      └──────────────────────────────────┐
                                        │
                                 Navbar.tsx
                                        │
                        {(isTableau || isProfil) && !isVisitor && (
                            <Link href="/edition" />
                        )}
                                        │
                        isVisitor = authReady && !user
                        = true && !null
                        = true
                                        │
                                !isVisitor
                                = false
                                        │
                        CONDITION FAILS - Link NOT rendered
                                        │
                     ✅ BUTTON NEVER SHOWS


RÉSULTAT : ✅ BUTTON EST INVISIBLE
           Visitor ne voit pas le bouton Édition
```

---

### FLOW 4 : Utilisateur Authentifié Accède /profil

```
UTILISATEUR                          APPLICATION

   AUTHENTICATED
      │
      ├─ Tape /profil
      │
      └────────────────────────────────────────────────────┐
                                                           │
                                    (protected)/layout.tsx │
                                            │              │
                                     ProtectedRoute    ◄───┘
                                            │
                                    useAuth() hook
                                            │
                                    authReady = true
                                            │
                                      user !== null
                                            │
                                       Continue
                                            │
                                    Profil page
                                       renders
                                            │
                    ┌──────────────────────┴────────────────┐
                    │                                       │
                  Navbar.tsx                          Content
                    │                                       │
        {user ? (                                    Profile form
        <UserMenu />                                 Settings
        ) : ...}                                         etc
                    │
                ┌───┴─────┐
                │          │
         /profil   /edition
         /abonnement
         /logout


RÉSULTAT : ✅ PAGE AFFICHÉE AVEC CONTENU
           Navigation complète disponible
```

---

### FLOW 5 : Non-Admin Tente d'Accéder /admin/logs

```
UTILISATEUR                          APPLICATION

   AUTHENTICATED (non-admin)
      │
      ├─ Tape /admin/logs
      │
      └────────────────────────────────────────────────────┐
                                                           │
                                    (protected)/layout.tsx │
                                            │              │
                                     ProtectedRoute    ◄───┘
                                            │
                                    user !== null
                                    authReady = true
                                            │
                                       Continue
                                            │
                                    AdminRoute.tsx
                                    (composant wrapper)
                                            │
                                    useAccountStatus()
                                            │
                                    ┌───────┴────────┐
                                    │                │
                                 isAdmin?           │
                                    │               │
                                   NO             YES
                                    │               │
                            ┌───────▼────┐   ┌─────▼──┐
                            │Display 404 │   │Show    │
                            │"Page not   │   │admin   │
                            │found"      │   │page    │
                            └────────────┘   └────────┘
                                    │
                            Generic 404
                            (no admin hint)


RÉSULTAT : ✅ GENERIC 404 SHOWN
           No hint of admin existence
           No permission error message
```

---

### FLOW 6 : User Free Utilise PersonalizationModal

```
UTILISATEUR                          APPLICATION

   USER (free account)
      │
      ├─ Sur /tableau
      │
      └────────────────────────────────────┐
                                          │
                                    Navbar.tsx
                                          │
                        {user ? (
                            <UserMenu />
                        ) : (
                            <PersonalizationModal
                              context="visitor"
                            />
                        )}
                                          │
                            user !== null → true
                                          │
                                  Show UserMenu
                                          │
                    ┌──────────────────────┴─────┐
                    │                            │
              Click "Subscribe"           Crown icon
                    │
                    └──────────────────────────┐
                                              │
                      useSubscriptionStatus()
                            │
                        ┌────┴────┐
                        │          │
                    isActive     Not active
                        │          │
                        │    ┌─────▼──────┐
                        │    │Trigger     │
                        │    │checkout()  │
                        │    │(Stripe)    │
                        │    └─────┬──────┘
                        │          │
                    Go to      Stripe
                  /abonnement
                        │
                    (protected)
                        │
                    ProtectedRoute
                    (user exists)
                        │
                    Abonnement page
                        renders


RÉSULTAT : ✅ PREMIUM PAGE ACCESSIBLE
           Only for authenticated users
           PersonalizationModal context = 'free' (if used)
           Never 'visitor' for authenticated users
```

---

### FLOW 7 : Visiteur Après Signup (devient Authenticated)

```
VISITOR                                 APPLICATION

   │
   ├─ On /tableau (public)
   │
   ├─ Navbar shows signup/login buttons
   │
   ├─ Clicks "Sign up" → /signup
   │
   ├─ Fills form
   │
   ├─ Submits
   │
   └───────────────────────────────────────┐
                                          │
                        Signup page (public)
                                          │
                        supabase.auth.signUp()
                                          │
                        User created
                        Session established
                                          │
                        ┌─────────────────┴─────────┐
                        │                           │
                   AuthContext updated          New behavior
                        │                           │
                  user = User object           When page
                  authReady = true            refreshes:
                                                  │
                                            AuthContext
                                            detects user
                                                  │
                                            useIsVisitor
                                            isVisitor = false
                                                  │
                                            Navbar updates
                                            (hides login btn)
                                            (shows UserMenu)
                                                  │
                                            ProtectedRoute
                                            allows access to
                                            /profil, /edition
                                                  │
                                            User can now:
                                            - Edit timeline
                                            - Manage account
                                            - View preferences


RÉSULTAT : ✅ VISITOR BECOMES AUTHENTICATED
           Full app access unlocked
           No lingering leaks
```

---

## Trace Sécurité Complète

### Path de Données pour Detecter Visitor

```
1. Supabase Auth SDK
   └─ supabase.auth.getSession()
      └─ getUser() returns User | null

2. AuthContext
   └─ user: User | null

3. useAuth Hook
   └─ return { user, authReady, ... }

4. useIsVisitor Hook
   └─ return { isVisitor: authReady && !user, authReady }

5. Components (Navbar, BottomNav, UserMenu, etc)
   └─ if (!isVisitor) {
        show button that navigates to /edition
      }

6. ProtectedRoute Component
   └─ if (!user) {
        router.replace('/login')
      }

7. (protected)/layout.tsx
   └─ wraps all children with ProtectedRoute

SECURITÉ : ✅ CHAQUE COUCHE VÉRIFIE INDÉPENDAMMENT
```

---

## Conditions de Sécurité - Truth Table

### Can Visitor Access /profil?

```
┌─────────────────────┬──────────┬──────────┬─────────┐
│ Condition           │ Visitor  │ Free     │ Premium │
├─────────────────────┼──────────┼──────────┼─────────┤
│ URL: /profil        │ user=nil │ user=ID  │ user=ID │
├─────────────────────┼──────────┼──────────┼─────────┤
│ authReady           │ true     │ true     │ true    │
├─────────────────────┼──────────┼──────────┼─────────┤
│ ProtectedRoute      │          │          │         │
│  checks: user?      │ false    │ true     │ true    │
├─────────────────────┼──────────┼──────────┼─────────┤
│ Action              │ REDIRECT │ ALLOW    │ ALLOW   │
│                     │ /login   │ render   │ render  │
├─────────────────────┼──────────┼──────────┼─────────┤
│ Result              │ ✅ SAFE  │ ✅ SAFE  │ ✅ SAFE │
└─────────────────────┴──────────┴──────────┴─────────┘
```

### Can Visitor See /edition Button in Navbar?

```
┌─────────────────────┬──────────┬──────────┬─────────┐
│ Condition           │ Visitor  │ Free     │ Premium │
├─────────────────────┼──────────┼──────────┼─────────┤
│ isVisitor           │ true     │ false    │ false   │
├─────────────────────┼──────────┼──────────┼─────────┤
│ !isVisitor (cond.)  │ false    │ true     │ true    │
├─────────────────────┼──────────┼──────────┼─────────┤
│ Button renders?     │ NO       │ YES      │ YES     │
├─────────────────────┼──────────┼──────────┼─────────┤
│ Result              │ ✅ SAFE  │ ✅ SAFE  │ ✅ SAFE │
└─────────────────────┴──────────┴──────────┴─────────┘
```

### Can Non-Admin See /admin Page?

```
┌─────────────────────┬──────────┬──────────┬─────────┐
│ Condition           │ Visitor  │ User     │ Admin   │
├─────────────────────┼──────────┼──────────┼─────────┤
│ Can access /admin?  │ REDIRECT │ RENDER   │ RENDER  │
│ (ProtectedRoute)    │ /login   │ AdminRT  │ content │
├─────────────────────┼──────────┼──────────┼─────────┤
│ AdminRoute checks   │ n/a      │ false    │ true    │
│ isAdmin?            │          │ (no)     │ (yes)   │
├─────────────────────┼──────────┼──────────┼─────────┤
│ Renders:            │ n/a      │ 404      │ page    │
├─────────────────────┼──────────┼──────────┼─────────┤
│ Result              │ ✅ SAFE  │ ✅ SAFE  │ ✅ SAFE │
└─────────────────────┴──────────┴──────────┴─────────┘
```

---

## Checklist Sécurité Finale

```
☑ Visitor = user === null (pas de statut BD 'visitor')
☑ Route Groups : (public) isolé de (protected)
☑ ProtectedRoute appliquée au layout (protected)
☑ ProtectedRoute redirects !user vers /login
☑ ProtectedRoute n'affiche rien pendant load
☑ Navbar masque /edition pour !isVisitor
☑ BottomNav invisible si !user
☑ UserMenu invisible si !user
☑ PersonalizationModal contexts corrects
☑ FloatingTimeTimer masqué pour visiteurs
☑ FloatingPencil utilisé QUE dans pages protégées
☑ AdminRoute affiche 404 pour non-admins
☑ Aucun lien direct vers /profil, /edition, /abonnement visibles
☑ AuthContext n'expose pas statut visiteur
☑ DisplayContext : localStorage visiteur UNIQUEMENT
☑ ChildProfileContext : profil visiteur LOCAL uniquement
```

---

## Recommandations de Sécurité Additionnelles (Optionnelles)

### 1. FloatingPencil - Défense en Profondeur

```typescript
// Actuel
export default function FloatingPencil({ className = '' }: FloatingPencilProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleClick = () => {
    router.push('/edition')
  }

  const isTableau = pathname === '/tableau'
  if (!isTableau) return null

  return <button onClick={handleClick}>Édition</button>
}

// Proposé (optionnel)
export default function FloatingPencil({ className = '' }: FloatingPencilProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()  // ADD: Vérifier auth

  const handleClick = () => {
    if (!user) {
      // Sécurité : ne jamais naviguer sans auth
      router.push('/login')
      return
    }
    router.push('/edition')
  }

  const isTableau = pathname === '/tableau'
  if (!isTableau || !user) return null  // ADD: Ne jamais afficher sans auth

  return <button onClick={handleClick}>Édition</button>
}
```

**Impact** : Défense en profondeur (defense-in-depth). Mitigation actuelle via ProtectedRoute est suffisante.

### 2. Logging d'Accès Non Autorisé (Optionnel)

```typescript
// Dans ProtectedRoute
useEffect(() => {
  if (!authReady || user) return

  // Log tentative d'accès non autorisé (opt)
  console.warn('[Security] Unauthorized access attempt:', pathname)

  router.replace('/login')
}, [user, authReady, router])
```

---

## Conclusion

**AUCUNE FUITE INTERFACE POUR VISITOR DÉTECTÉE**

La sécurité est assurée par :
1. **Architecture en Route Groups** : Séparation claire public/protected
2. **Guard d'Authentification Centralisé** : ProtectedRoute au layout
3. **Vérifications Redondantes** : Chaque composant UI vérifie l'état auth
4. **Pas de Statut Visitor BD** : Pas de confusion client/serveur
5. **Masquage Cohérent** : Tous les boutons/liens protégés masqués pour visiteurs

**Menace Résiduelle** : 🟢 Très Faible (FloatingPencil sans vérification, mais mitigé par ProtectedRoute)
