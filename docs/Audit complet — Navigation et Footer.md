Audit complet — Navigation et Footer

Architecture de base

src/app/  
 ├── layout.tsx ← RootLayout (Server) — HTML, body, providers
├── providers.tsx ← Providers (Client) — contextes globaux + BottomNav  
 │
├── (public)/layout.tsx ← Footer conditionnel + CookieBanner  
 │ ├── /tableau ← Mode kiosk TSA (enfant)  
 │ ├── /login, /signup, /forgot-password, /reset-password  
 │ └── /legal/\* ← 7 pages : accessibilité, CGU, CGV, cookies, mentions, confidentialité, RGPD  
 │  
 └── (protected)/layout.tsx ← Navbar + Footer conditionnel + CookieBanner
├── /edition ← Contexte adulte principal  
 ├── /profil  
 ├── /abonnement
└── /admin, /admin/logs, /admin/metrics, /admin/permissions

---

1. Footer

Composant

src/components/layout/footer/Footer.tsx — Client Component
src/components/layout/footer/Footer.scss

Contenu exact

┌──────────────────┬──────────┬──────────────────────────────────────────────────┐  
 │ Élément │ Type │ Lien/Action │
├──────────────────┼──────────┼──────────────────────────────────────────────────┤  
 │ Mentions légales │ <Link> │ /legal/mentions-legales │
├──────────────────┼──────────┼──────────────────────────────────────────────────┤
│ Confidentialité │ <Link> │ /legal/politique-confidentialite │
├──────────────────┼──────────┼──────────────────────────────────────────────────┤  
 │ CGU │ <Link> │ /legal/cgu │
├──────────────────┼──────────┼──────────────────────────────────────────────────┤  
 │ CGV │ <Link> │ /legal/cgv │
├──────────────────┼──────────┼──────────────────────────────────────────────────┤  
 │ Cookies │ <Link> │ /legal/politique-cookies │
├──────────────────┼──────────┼──────────────────────────────────────────────────┤
│ Refuser │ <button> │ Appelle revokeConsent() + location.reload() │
├──────────────────┼──────────┼──────────────────────────────────────────────────┤  
 │ Personnaliser │ <button> │ Dispatche CustomEvent('open-cookie-preferences') │
└──────────────────┴──────────┴──────────────────────────────────────────────────┘

Le footer contient uniquement des éléments légaux et de consentement cookies. Aucune logique métier.

Logique d'affichage — 2 layouts différents

PublicLayout (src/app/(public)/layout.tsx, ligne 15) :

const isAuthenticated = authReady && !!user  
 const showFooter = !(pathname === '/tableau' && isAuthenticated)

→ Sur /tableau : footer masqué seulement si authentifié  
 → Sur /tableau : footer visible pour les visiteurs non-connectés  
 → Sur toutes les autres routes publiques : footer toujours visible

ProtectedLayout (src/app/(protected)/layout.tsx, ligne 13) :

const showFooter = authReady && !user

→ Footer visible seulement si non-connecté sur les routes protégées
→ Concrètement : visible pour les Visiteurs (isVisitor=true, user=null) sur /edition
→ Masqué pour tous les utilisateurs connectés (free, subscriber, admin)

Tableau de visibilité Footer

┌─────────────────┬─────────────────────┬───────────────────┬───────────────────┐  
 │ Route │ Visitor (IndexedDB) │ Free/Sub connecté │ Admin connecté │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┤  
 │ /tableau │ ✅ Visible │ ❌ Masqué (kiosk) │ ❌ Masqué (kiosk) │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┤
│ /login, /signup │ ✅ Visible │ ✅ Visible │ ✅ Visible │  
 ├─────────────────┼─────────────────────┼───────────────────┼───────────────────┤  
 │ /legal/_ │ ✅ Visible │ ✅ Visible │ ✅ Visible │  
 ├─────────────────┼─────────────────────┼───────────────────┼───────────────────┤  
 │ /edition │ ✅ Visible │ ❌ Masqué │ ❌ Masqué │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┤  
 │ /profil │ ✅ Visible_ │ ❌ Masqué │ ❌ Masqué │
├─────────────────┼─────────────────────┼───────────────────┼───────────────────┤  
 │ /admin │ ❌ Redirigé │ ❌ Masqué │ ❌ Masqué │
└─────────────────┴─────────────────────┴───────────────────┴───────────────────┘

▎ \*Le Visitor peut-il accéder à /profil ? Voir anomalie #3 ci-dessous.

✅ Vérification TSA (enfant)

Le footer est entièrement masqué sur /tableau pour les utilisateurs authentifiés. Aucun élément légal, technique ou de consentement n'est visible côté
enfant. ✅

---

2. Navigation principale

2.1 BottomNav (mobile)

Fichier : src/components/layout/bottom-nav/BottomNav.tsx
Montage : src/app/providers.tsx — ligne 43 (global, toutes routes)

Condition de rendu (ligne 39) :

if (!user || pathname === '/tableau') return null

→ Nécessite user authentifié (pas disponible pour les Visiteurs)  
 → Masqué sur /tableau systématiquement

Breakpoint CSS réel (BottomNav.scss, ligne 44) :

@include respond-to(lg) { // ≥ 1024px  
 display: none;  
 }

▎ ⚠️ Le commentaire dans providers.tsx dit "Mobile only (< 768px)" mais le CSS masque à 1024px. Incohérence commentaire/code.

Items de navigation :

┌─────────┬──────────┬─────────────────┬─────────────────────────────┐  
 │ Item │ Route │ Icône │ Condition │
├─────────┼──────────┼─────────────────┼─────────────────────────────┤
│ Tableau │ /tableau │ LayoutDashboard │ Toujours présent │
├─────────┼──────────┼─────────────────┼─────────────────────────────┤
│ Édition │ /edition │ Pencil │ Toujours présent │  
 ├─────────┼──────────┼─────────────────┼─────────────────────────────┤
│ Profil │ /profil │ User │ Toujours présent │  
 ├─────────┼──────────┼─────────────────┼─────────────────────────────┤
│ Admin │ /admin │ Shield │ isAdmin === true uniquement │
└─────────┴──────────┴─────────────────┴─────────────────────────────┘

Particularité : L'item Tableau n'est jamais active dans la BottomNav (puisqu'on return null quand on est sur /tableau).

2.2 Navbar (desktop)

Fichier : src/components/layout/navbar/Navbar.tsx  
 Montage : src/app/(protected)/layout.tsx — ligne 19 (routes protégées uniquement)

Condition de rendu (ligne 43) :

if (!user || pathname === '/tableau') return null

Breakpoint CSS (Navbar.scss) :

display: none; // Masquée par défaut (mobile)
@include respond-to(lg) { // ≥ 1024px  
 display: flex; // Visible sur desktop  
 }

Contenu :

- Logo "Appli-Picto" → lien vers /edition (gauche)
- SettingsMenu affiché uniquement sur /edition (isEdition && <SettingsMenu />)
- Items de navigation identiques à BottomNav (droite)
- Skip link WCAG 2.4.1 (#main-content)

▎ La Navbar n'est montée que dans (protected)/layout.tsx. Elle n'est jamais présente sur les routes publiques (/tableau, /login, etc.), même si le  
 ▎ composant a sa propre condition !user.

---

3. Règles globales de visibilité

Vue synthétique

┌───────────┬───────────────────────┬───────────────────────┬──────────────────────┬───────────────────────┐  
 │ Composant │ Mobile < 1024px │ Desktop ≥ 1024px │ Condition auth │ Route /tableau │
├───────────┼───────────────────────┼───────────────────────┼──────────────────────┼───────────────────────┤  
 │ BottomNav │ ✅ Visible │ ❌ CSS: display: none │ user connecté requis │ ❌ Masqué │
├───────────┼───────────────────────┼───────────────────────┼──────────────────────┼───────────────────────┤
│ Navbar │ ❌ CSS: display: none │ ✅ Visible │ user connecté requis │ ❌ Masqué │  
 ├───────────┼───────────────────────┼───────────────────────┼──────────────────────┼───────────────────────┤  
 │ Footer │ ✅ Visible │ ✅ Visible │ Logique par layout │ ❌ Masqué si connecté │  
 └───────────┴───────────────────────┴───────────────────────┴──────────────────────┴───────────────────────┘

---

4. Audit par rôle utilisateur

Visitor (mode local, isVisitor=true, user=null)

┌─────────────────────┬────────────┬────────────────────────────────────────┐
│ Composant │ État │ Détail │
├─────────────────────┼────────────┼────────────────────────────────────────┤
│ BottomNav │ ❌ Masqué │ !user → return null (ligne 39) │
├─────────────────────┼────────────┼────────────────────────────────────────┤
│ Navbar │ ❌ Masqué │ !user → return null (ligne 43) │
├─────────────────────┼────────────┼────────────────────────────────────────┤
│ Footer sur /tableau │ ✅ Visible │ isAuthenticated = false │
├─────────────────────┼────────────┼────────────────────────────────────────┤
│ Footer sur /edition │ ✅ Visible │ showFooter = authReady && !user = true │
├─────────────────────┼────────────┼────────────────────────────────────────┤
│ Footer sur /login │ ✅ Visible │ Toujours visible (routes publiques) │
└─────────────────────┴────────────┴────────────────────────────────────────┘

Risque UX : Le Visitor sur /edition voit le footer avec CGU/CGV/cookies, sans aucune navigation. Il peut naviguer vers les pages légales mais pas  
 revenir (pas de nav). ⚠️

Free (connecté, pas d'abonnement actif)

┌─────────────────┬───────────────────────────────┬──────────────────────────────────────┐  
 │ Composant │ Mobile │ Desktop │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────┤  
 │ BottomNav │ ✅ Tableau · Édition · Profil │ ❌ Masqué │
├─────────────────┼───────────────────────────────┼──────────────────────────────────────┤
│ Navbar │ ❌ Masqué │ ✅ Logo + Tableau · Édition · Profil │  
 ├─────────────────┼───────────────────────────────┼──────────────────────────────────────┤
│ Footer │ ❌ Masqué (protected) │ ❌ Masqué (protected) │  
 ├─────────────────┼───────────────────────────────┼──────────────────────────────────────┤  
 │ Footer /tableau │ ❌ Masqué (kiosk) │ ❌ Masqué (kiosk) │
└─────────────────┴───────────────────────────────┴──────────────────────────────────────┘

Accès légal : Liens légaux accessibles uniquement via la carte RGPD du Profil ou en se déconnectant. ⚠️

Subscriber (abonnement actif)

Identique à Free pour navigation et footer. La distinction isAdmin/rôle ne change pas la visibilité des nav/footer pour les subscribers.

Admin

┌───────────┬───────────────────────────────────────┬──────────────────────────────────────────────┐  
 │ Composant │ Mobile │ Desktop │
├───────────┼───────────────────────────────────────┼──────────────────────────────────────────────┤  
 │ BottomNav │ ✅ Tableau · Édition · Profil · Admin │ ❌ Masqué │
├───────────┼───────────────────────────────────────┼──────────────────────────────────────────────┤
│ Navbar │ ❌ Masqué │ ✅ Logo + Tableau · Édition · Profil · Admin │
├───────────┼───────────────────────────────────────┼──────────────────────────────────────────────┤  
 │ Footer │ ❌ Masqué (protected) │ ❌ Masqué (protected) │
└───────────┴───────────────────────────────────────┴──────────────────────────────────────────────┘

Item /admin présent dans BottomNav ET Navbar — la route existe bien (/admin, /admin/logs, /admin/metrics, /admin/permissions). ✅

---

5. Anomalies et incohérences détectées

🔴 Anomalie #1 — Commentaire incorrect dans providers.tsx

Fichier : src/app/providers.tsx, ligne 42
Commentaire : "Bottom Navigation Bar - Mobile only (< 768px)"
Réalité CSS : breakpoint respond-to(lg) = 1024px

C'est une incohérence commentaire/code. Le comportement réel est correct (1024px), mais le commentaire induit en erreur. À corriger.

🟡 Anomalie #2 — Footer logique dupliquée entre deux layouts

La condition showFooter est définie deux fois avec des logiques différentes :

- (public)/layout.tsx : prend en compte le pathname + isAuthenticated
- (protected)/layout.tsx : vérifie uniquement authReady && !user

Si la règle change (ex : afficher le footer sur /tableau pour tout le monde), il faut modifier deux fichiers. Risque de désynchronisation.

Recommandation : Extraire un hook useShowFooter(pathname) partagé.

🟡 Anomalie #3 — Visitor sans navigation sur pages légales

Quand un Visitor clique sur "Mentions légales" depuis le footer d'/edition, il arrive sur /legal/mentions-legales (route publique). Il voit le footer, mais
il n'a aucun moyen de revenir à /edition sans le bouton "Retour" du navigateur. Aucune BottomNav, aucune Navbar (pas connecté).

Impact TSA : faible (c'est un adulte en mode Visitor), mais l'UX est dégradée.

🟢 Bonne décision confirmée — Logique kiosk TSA

La règle /tableau → masquer tout (BottomNav, Navbar, Footer) pour les utilisateurs connectés est correcte et cohérente. L'enfant ne voit aucun élément de
navigation ou légal. ✅

🟢 Bonne décision confirmée — SettingsMenu contextuel

SettingsMenu n'apparaît que sur /edition. Aucun risque de le voir sur /profil, /tableau ou /admin. ✅

---

Résumé en une phrase

Le système est bien conçu sur le fond — kiosk TSA propre, séparation mobile/desktop correcte — mais présente un commentaire incorrect sur le breakpoint (768
vs 1024px) et une logique Footer dupliquée entre deux layouts qui gagnerait à être centralisée.

Veux-tu qu'on corrige le commentaire providers.tsx maintenant, et/ou qu'on extraie le hook useShowFooter() ?

✻ Worked for 6m 32s

※ recap: Audit du système navigation et footer terminé. Deux anomalies mineures identifiées : un commentaire incorrect sur le breakpoint (768 vs 1024px) dans
providers.tsx, et une logique Footer dupliquée entre deux layouts. Corriger le commentaire en premier ? (disable recaps in /config)
