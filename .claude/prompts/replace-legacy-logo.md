# Remplacement logo legacy inline → logo SVG officiel

## Posture obligatoire

Tu es en mode AUDIT-FIRST. Deux phases STRICTEMENT séquentielles :

- **Phase 1** : READ-ONLY. Aucun `Edit`, `Write`, `Create`. Production d'un rapport.
- **Phase 2** : Implémentation, UNIQUEMENT après que Temo ait validé explicitement le rapport Phase 1 par le message exact "GO Phase 2".

Tu ne fais AUCUN commit. Tu ne fais AUCUN push. Tu laisses Temo gérer les commits manuellement.

---

## Contexte projet

- Appli-Picto, Next.js 16 App Router, TS strict, Sass tokens.
- Les pages d'authentification et la Navbar publique utilisent actuellement un logo "ancien" implémenté inline (probablement SVG inline dans le JSX, ou ASCII art, ou composant ad-hoc).
- Un logo officiel vectoriel (SVG) existe déjà dans le projet. Sa localisation exacte n'est PAS connue de Temo et doit être trouvée par l'audit.
- Le design system suit la discipline tokens Sass stricte (voir `CSS_ARCHITECTURE.md`).
- Contexte TSA : prévisibilité visuelle, transitions <0.3s linear, focus visible WCAG 2.2 AA.

---

## Décisions Temo (verrouillées)

1. **Destination du clic** : le logo, sur les 4 pages d'auth ET sur la Navbar publique, redirige vers `/tableau` (accès Visitor possible sans authentification, contexte enfant prévisible).
2. **Périmètre** : exactement 5 emplacements à remplacer :
   - `app/login/page.tsx` (ou équivalent route App Router)
   - `app/signup/page.tsx`
   - `app/forgot-password/page.tsx`
   - `app/reset-password/page.tsx`
   - `components/layout/navbar-visiteur/NavbarVisiteur.tsx` (ou équivalent)
3. **Architecture composant** : à décider après audit — Claude Code CLI propose en Phase 1, Temo arbitre avant Phase 2.
4. **Comportement visuel** : adapté au contexte — Claude Code CLI inventorie l'existant et propose les tailles/variantes par contexte.
5. **Texte associé** : à inventorier — si l'existant comporte un baseline, sous-titre ou wordmark, Claude Code CLI le documente et propose conservation/refactor/suppression.
6. **Accessibilité** : le logo doit avoir un `alt` ou `aria-label` explicite ("Appli-Picto — retour au tableau"), être focusable au clavier, et respecter les transitions TSA (<0.3s linear, pas de bounce ni scale agressif au hover).

---

## Phase 1 — Audit lecture seule

### 1.1 Localisation du logo officiel vectoriel

- Recherche exhaustive dans `public/`, `src/`, `assets/`, `static/` de tous les fichiers `.svg`.
- Lister chaque SVG trouvé : chemin, taille en octets, viewBox, mots-clés `appli-picto`, `logo`, `brand`, `mark` dans le contenu ou le nom.
- Identifier le candidat "logo officiel" (probablement nommé `logo.svg`, `appli-picto.svg`, ou similaire).
- Si plusieurs variantes existent (light/dark, monochrome, couleur, avec texte/sans texte) : toutes les lister avec leur usage potentiel.
- Si AUCUN SVG candidat n'est trouvé : STOP, signaler à Temo, ne pas inventer.

### 1.2 Inventaire des 5 emplacements legacy

Pour chacun des 5 fichiers cible :

- Confirmer l'existence du fichier (chemin exact).
- Localiser le bloc JSX correspondant au logo actuel (lignes précises).
- Documenter l'implémentation actuelle :
  - SVG inline ? Composant local ? `<img>` avec un autre SVG ? ASCII / texte stylé ?
  - Présence de texte associé (baseline, wordmark, sous-titre) ?
  - Liens existants (le logo est-il déjà cliquable ? Vers où ?)
  - Classes CSS / SCSS utilisées (et fichier SCSS associé)
  - Comportement (`hover`, `focus`, animations existantes)

### 1.3 Inventaire des dimensions et styles par contexte

Pour chaque contexte, extraire des fichiers SCSS associés :

- Largeur / hauteur actuelle (ou aspect ratio si fluide)
- Position dans la page (centré, à gauche, en haut, etc.)
- Espacements environnants (`margin`, `padding`, `gap`)
- Suggérer les tokens `size()` et `spacing()` appropriés selon `CSS_ARCHITECTURE.md` (ne pas inventer — utiliser uniquement les clés existantes)
- Si une dimension actuelle ne correspond à AUCUN token existant : signaler comme "nouveau token requis" sans le créer

### 1.4 Proposition d'architecture composant

Sur la base de ce qui a été inventorié :

- Proposer 2 options d'architecture (ex. : composant `Logo.tsx` réutilisable vs duplication contrôlée).
- Pour chaque option : avantages, inconvénients, impact sur les 5 fichiers cibles, scalabilité future.
- Donner une **recommandation argumentée** (pas un "à toi de voir").
- Si composant : proposer une signature de props (`size`, `variant`, `href`, `withText`, `aria-label`) avec valeurs par défaut.

### 1.5 Proposition d'accessibilité + transitions TSA

- `alt` / `aria-label` proposé pour chaque contexte (auth vs navbar peuvent différer)
- Focus ring : utiliser `focus-ring()` mixin existant si présent, sinon proposer
- Transition au hover : <0.3s linear, ce qui change (opacity ? underline ? rien ?)
- `prefers-reduced-motion` : comportement si activé

### 1.6 Hors périmètre — signalements

Si pendant l'audit tu détectes :

- D'AUTRES usages legacy du logo HORS des 5 fichiers (ex : footer, page maintenance, 404, email templates, favicon)
- Présence du logo dans le `<head>` (favicon, og:image, apple-touch-icon)
- Des assets logos obsolètes/orphelins qui pourraient être supprimés

→ Lister en section "Hors périmètre — décisions Temo nécessaires" sans corriger.

### Format de sortie Phase 1

Un seul fichier : `audits/REPLACE_LOGO_PHASE1_<YYYY-MM-DD>.md`

Structure :

1. Résumé exécutif (10 lignes max) + verdict GO/NO-GO pour Phase 2
2. Section 1.1 — Logo officiel localisé (chemin, variantes, recommandation)
3. Section 1.2 — Tableau des 5 emplacements legacy avec lignes précises
4. Section 1.3 — Tableau dimensions/styles par contexte avec tokens suggérés
5. Section 1.4 — Options d'architecture + recommandation argumentée
6. Section 1.5 — Accessibilité + transitions TSA
7. Section 1.6 — Hors périmètre (si applicable)
8. Plan détaillé Phase 2 : fichier par fichier, opération par opération
9. Checklist "Prêt pour GO Phase 2"

### Critères d'arrêt Phase 1

Tu t'arrêtes et attends "GO Phase 2" de Temo. Tu ne procèdes PAS à Phase 2 même si Temo dit "ok", "continue", "vas-y" — seulement sur le message exact "GO Phase 2".

---

## Phase 2 — Implémentation (déclenchée par "GO Phase 2" uniquement)

### 2.1 Pré-flight

- Re-lire le rapport Phase 1 généré.
- Confirmer la branche courante (`feature/re-design-edition` attendue).
- `git status` doit être clean. Si non, STOP et signaler.

### 2.2 Implémentation selon architecture validée

Si architecture = composant réutilisable :

- Créer `Logo.tsx` (+ `Logo.scss` si nécessaire) selon la signature validée en Phase 1.
- Le composant utilise `next/image` ou `next/link` selon contexte. Justifier le choix.
- Tokens Sass STRICTS : aucune valeur hardcodée, uniquement `size()`, `spacing()`, `radius()`, `semantic()`, etc.
- Le composant gère `prefers-reduced-motion` via mixin existante.

Si architecture = duplication contrôlée :

- Appliquer le pattern validé dans chacun des 5 fichiers.

### 2.3 Intégration dans les 5 emplacements

Pour chacun des 5 fichiers cible :

1. Supprimer l'ancien logo inline (et tout texte associé décidé en Phase 1)
2. Insérer le nouveau composant Logo (ou le `<Image>` + `<Link>` selon architecture)
3. Adapter le SCSS associé : supprimer styles legacy obsolètes, conserver les styles de positionnement parent
4. Vérifier que la destination `/tableau` est correcte
5. Vérifier `aria-label` ou `alt`

### 2.4 Validation après chaque fichier modifié

- `pnpm check`
- `pnpm test`
- `pnpm type-check`

Après les 5 fichiers traités :

- `pnpm build`
- `pnpm lint:hardcoded`

Si une commande échoue : STOP. Annoter dans le rapport. Ne pas continuer.

### 2.5 Format de sortie Phase 2

Un seul fichier : `audits/REPLACE_LOGO_PHASE2_<YYYY-MM-DD>.md`

Structure :

1. Résumé : fichiers modifiés, composant créé (si applicable), opérations exécutées
2. Diff résumé par fichier
3. Résultats des 5 commandes de validation
4. Liste des fichiers modifiés (path absolu + nb lignes diff)
5. Suggestion de commits atomiques avec messages conventionnels prêts à l'emploi
6. Checklist visuelle pour Temo (parcours sur les 5 contextes)
7. Hors périmètre détecté en Phase 2 (si applicable)

---

## Contraintes globales

- Aucun `git commit`, `git push`, `git stash`. Tout reste local non commit.
- Aucune modification du logo SVG officiel lui-même (pas d'optimisation, pas de refactor du fichier source).
- Aucune création de nouveau token Sass (taille, couleur, espacement). Si besoin : signaler en Phase 1, attendre validation Temo.
- Aucun composant créé en dehors de ce qui est strictement nécessaire pour les 5 emplacements.
- Respect DB-first : aucun appel Supabase, aucun hook réseau, le logo est purement statique.
- Le composant Logo doit être un Server Component si possible (pas de `'use client'` sauf justifié).
- Aucune modification de pages HORS des 5 ciblées, même si tu détectes le même problème ailleurs (signaler en hors périmètre).

---

## Critères de recette finale (à valider par Temo)

- [ ] `pnpm build` passe
- [ ] `pnpm test` passe (216 tests précédents)
- [ ] `pnpm type-check` passe
- [ ] `pnpm lint:hardcoded` passe
- [ ] Sur les 5 pages : logo officiel visible, taille adaptée au contexte
- [ ] Clic sur le logo → navigation vers `/tableau` (vérifier dans navigateur)
- [ ] Focus clavier sur logo : focus ring visible WCAG conforme
- [ ] `aria-label` ou `alt` audible / lisible par lecteur d'écran
- [ ] Hover : transition <0.3s linear, pas de bounce/scale agressif
- [ ] `prefers-reduced-motion` activé : aucune animation visible
- [ ] Test visuel sur mobile (viewport <768px) : logo adapté
- [ ] Aucune régression visuelle sur les autres composants des 5 pages
