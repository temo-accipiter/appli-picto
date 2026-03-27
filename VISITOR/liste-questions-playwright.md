📋 Comment utiliser cette liste

Tu peux me poser ces questions une par une, ou par groupe thématique. Je naviguerai dans ton application avec Playwright
pour vérifier visuellement et fonctionnellement la conformité avec tes specs.

---

🎨 1. Contextes UX — Séparation stricte (CRITIQUE)

Questions à me poser :

1. "Vérifie que la Page Tableau ne contient AUCUN message technique, quota, offline, ou commercial"


    - Je vais capturer Tableau et chercher : toasts, bandeaux, messages réseau, mentions abonnement

2. "Vérifie que la Page Édition affiche bien les indicateurs offline/quota/feature gating"


    - Je vais tester : bandeau offline, messages quota, PersonalizationModal

3. "Vérifie que le sélecteur de profil enfant actif fonctionne sans perte de contexte"


    - Je vais changer d'enfant actif et vérifier : timeline chargée, sessions distinctes, pas de mélange

4. "Vérifie qu'on ne peut PAS modifier la structure depuis le Contexte Tableau"


    - Je vais chercher : boutons d'édition, drag & drop, actions CRUD sur Tableau → doivent être absents

---

📱 2. Mobile-First & Accessibilité TSA

Questions à me poser :

5. "Vérifie que toutes les interactions critiques sont utilisables à une main sur mobile (viewport 375px)"


    - Je vais redimensionner en 375×667 et tester : checkboxes, sélecteurs, navigation

6. "Vérifie que les cibles tactiles font au minimum 44×44px"


    - Je vais mesurer : boutons, checkboxes, cartes cliquables

7. "Vérifie que les animations respectent prefers-reduced-motion"


    - Je vais activer prefers-reduced-motion et observer : jetons, transitions, confettis

8. "Vérifie que le focus est toujours visible et prévisible"


    - Je vais naviguer au clavier et vérifier : outline visible, ordre logique

---

🎴 3. Planning Visuel — Timelines & Slots

Questions à me poser :

9. "Vérifie que les slots vides (card_id = NULL) sont invisibles en Contexte Tableau"


    - Je vais créer un slot vide en Édition, puis aller sur Tableau → ne doit pas apparaître

10. "Vérifie que la grille de jetons reflète uniquement les slots Étape NON vides"


    - Je vais compter : nombre de cases grille = somme jetons des slots avec carte

11. "Vérifie que 'Vider la timeline' remet la structure à 1 slot Étape vide + 1 slot Récompense vide"


    - Je vais déclencher "Vider" et vérifier l'état final en Édition

12. "Vérifie que le dernier slot Étape ne peut PAS être supprimé (invariant min 1 slot)"


    - Je vais tenter de supprimer le dernier slot Étape → bouton désactivé ou action refusée

---

🎯 4. Sessions — États & Verrouillage

Questions à me poser :

13. "Vérifie que la progression utilise steps_total_snapshot (pas un recomptage live)"


    - Je vais valider des étapes, modifier la timeline en Édition, revenir Tableau → progression stable

14. "Vérifie qu'une session Terminée affiche la récompense et empêche toute nouvelle validation"


    - Je vais terminer toutes les étapes et vérifier : carte récompense débloquée, checkboxes désactivées

15. "Vérifie que les slots validés sont verrouillés en Édition (session démarrée)"


    - Je vais valider 2 étapes, retourner en Édition → slots validés = grisés, non déplaçables, jetons figés

16. "Vérifie que les slots NON validés restent éditables pendant une session active"


    - Je vais modifier un slot non validé (déplacer, changer jetons) → doit fonctionner

17. "Vérifie que la suppression d'un slot au focus bascule automatiquement vers la prochaine étape"


    - Je vais supprimer le slot au focus depuis Édition → focus doit se déplacer, pas d'écran vide

---

🧩 5. Séquençage — Mini-timeline

Questions à me poser :

18. "Vérifie que la mini-timeline de séquence s'affiche uniquement quand la carte mère est au focus"


    - Je vais naviguer entre étapes et observer : mini-timeline visible uniquement sur carte mère active

19. "Vérifie que le tap sur l'image/nom de carte mère ne valide JAMAIS"


    - Je vais cliquer image et nom → aucune validation (seule la checkbox valide)

20. "Vérifie que la mini-timeline se referme automatiquement à la validation de la carte mère"


    - Je vais ouvrir mini-timeline, valider carte mère → transition douce de fermeture

21. "Vérifie que l'état 'fait' des étapes de séquence est local-only et ne bloque rien"


    - Je vais griser toutes les étapes ou aucune → validation carte mère toujours possible

---

🌐 6. Offline & Synchronisation

Questions à me poser :

22. "Vérifie que le bandeau offline persistant s'affiche en Édition (pas juste un toast)"


    - Je vais passer offline → bandeau discret visible jusqu'au retour online

23. "Vérifie qu'AUCUN indicateur offline n'apparaît en Contexte Tableau"


    - Je vais passer offline sur Tableau → aucun message, aucune bannière

24. "Vérifie que les actions structurelles sont désactivées offline (Édition)"


    - Je vais tenter : créer carte, modifier timeline, ajouter slot → désactivé + toast

25. "Vérifie que l'exécution continue offline (validations fonctionnent)"


    - Je vais valider des étapes offline → progression locale enregistrée

---

🎭 7. Statuts & Feature Gating

Questions à me poser :

26. "Vérifie que Visitor ne voit PAS le bouton 'Créer carte perso' ni 'Gérer catégories'"


    - Je vais naviguer en mode Visitor → actions perso absentes

27. "Vérifie que Free voit PersonalizationModal avec le bon message (vs Visitor)"


    - Je vais déclencher action perso en Free → modal avec texte "Ton compte gratuit..."

28. "Vérifie que Subscriber peut créer cartes perso et catégories"


    - Je vais tester CRUD complet en mode Subscriber

29. "Vérifie que les profils locked sont affichés en lecture seule (downgrade)"


    - Je vais simuler downgrade → profils excédentaires marqués "verrouillé"

---

🗑️ 8. Suppressions & Modals

Questions à me poser :

30. "Vérifie que la suppression de carte utilisée affiche le modal avec wording contractuel"


    - Je vais supprimer une carte en usage → modal : "Cette carte est actuellement utilisée. La supprimer la retirera de

tous ses usages." 31. "Vérifie que la suppression du dernier profil enfant est bloquée" - Je vais tenter de supprimer le dernier profil → action refusée avec message 32. "Vérifie que décocher une carte bibliothèque retire TOUTES ses occurrences + reflow" - Je vais décocher une carte présente 3× dans la timeline → disparaît partout, pas de trous

---

🎨 9. Animations & Préférences

Questions à me poser :

33. "Vérifie que les confettis s'affichent UNIQUEMENT si confetti_enabled = true ET reduced_motion = false"


    - Je vais tester les 4 combinaisons de préférences

34. "Vérifie que les jetons volent vers la grille (ou apparaissent directement si reduced_motion)"


    - Je vais valider une étape avec jetons et observer l'animation

35. "Vérifie que la TrainProgressBar est statique si reduced_motion = true"


    - Je vais activer reduced_motion → barre sans animation

---

🔐 10. Protection Enfant & Navigation

Questions à me poser :

36. "Vérifie qu'on ne peut pas accéder à Édition depuis Tableau par inadvertance"


    - Je vais chercher : liens, boutons, gestes → mécanisme de protection actif

37. "Vérifie que Visitor n'a PAS accès à la Page Profil"


    - Je vais tenter d'accéder /profil en Visitor → redirect ou 404

38. "Vérifie que la Page Administration est invisible pour non-Admin (404, pas d'indice)"


    - Je vais tenter d'accéder /admin en Free → 404 neutre, pas de message "accès refusé"

---

📊 11. Quotas & Messages UX

Questions à me poser :

39. "Vérifie que le quota profils affiche 'Nombre maximum de profils enfants atteint.'"


    - Je vais atteindre la limite Free (1 profil) → message exact

40. "Vérifie que le quota devices affiche 'Nombre maximum d'appareils atteint.'"


    - Je vais tester enregistrement device au-delà limite

41. "Vérifie que le toast offline affiche 'Indisponible hors connexion'"


    - Je vais déclencher action offline → toast avec texte exact

---

🍪 12. RGPD & Consentement

Questions à me poser :

42. "Vérifie que la bannière cookies est adulte-only (jamais sur Tableau)"


    - Je vais charger Tableau en première visite → aucune bannière

43. "Vérifie que le payload log-consent contient bien mode ET action séparés (bug legacy corrigé)"


    - Je vais inspecter l'appel réseau → structure JSON conforme

44. "Vérifie que GA4 n'est PAS chargé tant que choices.analytics !== true"


    - Je vais refuser analytics → aucun script GA4 dans le DOM

---

📱 13. Responsive & Viewport

Questions à me poser :

45. "Vérifie que la timeline en Édition est sticky (reste visible au scroll)"


    - Je vais scroller la bibliothèque → timeline reste en haut

46. "Vérifie que la mini-timeline de séquence scrolle horizontalement sans geste complexe"


    - Je vais tester swipe horizontal → fluide, utilisable à une main

47. "Vérifie que les slots de la timeline dépassant l'écran activent un scroll horizontal"


    - Je vais ajouter 10 slots → scroll horizontal actif, pas de casse layout

---

🎯 Questions transversales / combinées

48. "Audit complet Contexte Tableau : aucun message technique, animations TSA-safe, slots vides invisibles, focus clair"
49. "Audit complet Contexte Édition : bandeau offline, quotas, verrouillage session, sticky timeline"
50. "Audit mobile-first 375px : navigation une main, cibles 44px, pas de scroll horizontal involontaire"

---

🚀 Comment procéder

Tu peux me demander :

- ✅ Une question précise : "Question 13 : vérifie le snapshot de progression"
- ✅ Un groupe thématique : "Vérifie toutes les questions du groupe Sessions (13-17)"
- ✅ Un audit complet d'une page : "Audit Contexte Tableau complet (questions transversales)"
- ✅ Un parcours utilisateur : "Parcours Visitor : composition timeline + exécution + séquence (questions 9, 18, 26)"

Je naviguerai, prendrai des screenshots, et te donnerai un rapport de conformité structuré avec :

- ✅ Conforme
- ⚠️ Non conforme (avec détails)
- ℹ️ Observation (points d'attention)
