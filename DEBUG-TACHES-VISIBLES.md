# 🐛 DEBUG: Tâches restent visibles après décochage

## Symptôme
Les tâches restent visibles dans Tableau même après avoir été décochées dans Edition.

## Test à effectuer

### Préparation
1. Ouvrez la console DevTools (F12 → Console)
2. Naviguez vers **http://localhost:5174/tableau**
3. Notez les tâches visibles

### Étape 1: Décocher une tâche
1. Allez sur **/edition**
2. **Décochez une tâche** (cliquez sur ☑️ pour la décocher)
3. Vérifiez dans la console qu'il n'y a pas d'erreur
4. La tâche devrait maintenant avoir `aujourdhui=false` en BDD

### Étape 2: Retour sur Tableau
1. Cliquez sur le lien **Tableau** dans la navbar
2. **Surveillez la console** - vous devriez voir:
   ```
   🔄 Reload tableau depuis /edition
   🔄 useTachesDnd: Loading tasks with aujourdhui=true, reload= <NUMBER>
   ✅ useTachesDnd: Loaded <N> tasks with aujourdhui=true
   ```

### Résultats attendus vs observés

#### ✅ Comportement attendu:
- Console affiche: `🔄 Reload tableau depuis /edition`
- Console affiche: `🔄 useTachesDnd: Loading tasks...`
- Console affiche: `✅ useTachesDnd: Loaded X tasks` (X = nombre SANS la tâche décochée)
- La tâche décochée **disparaît** du Tableau

#### ❌ Si le problème persiste:

**Cas 1**: Le reload ne se déclenche PAS
- Console ne montre pas `🔄 Reload tableau depuis /edition`
- **Cause**: La détection de navigation ne fonctionne pas
- **Solution**: Vérifier `location.pathname` et `prevPathRef`

**Cas 2**: Le reload se déclenche MAIS la tâche reste
- Console montre `🔄 Reload tableau depuis /edition`
- Console montre `✅ useTachesDnd: Loaded X tasks` où X inclut toujours la tâche
- **Cause**: La BDD n'a pas été mise à jour correctement
- **Solution**: Vérifier `toggleAujourdhui` dans Edition

**Cas 3**: Aucun log dans la console
- **Cause**: Le composant ne se monte pas ou erreur JavaScript
- **Solution**: Vérifier la console pour des erreurs

## Vérification manuelle en BDD

Pour vérifier si `aujourdhui` a bien été mis à jour:

```sql
-- Dans Supabase SQL Editor
SELECT id, label, aujourdhui, fait
FROM taches
WHERE user_id = '<YOUR_USER_ID>'
ORDER BY position;
```

**Attendu**: La tâche décochée devrait avoir `aujourdhui = false`

## Solutions possibles

### Solution 1: Si reload ne se déclenche pas
Ajouter un bouton de reload manuel dans Tableau:
```jsx
<button onClick={() => setReloadKey(prev => prev + 1)}>
  🔄 Recharger
</button>
```

### Solution 2: Si toggleAujourdhui échoue
Vérifier les erreurs dans Edition:
- Ouvrir console avant de décocher
- Chercher erreurs Supabase
- Vérifier permissions RLS

### Solution 3: Si tout échoue
Utiliser Supabase Realtime:
```javascript
// Dans useTachesDnd
useEffect(() => {
  const subscription = supabase
    .channel('taches-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'taches' },
      () => loadTaches()
    )
    .subscribe()

  return () => subscription.unsubscribe()
}, [loadTaches])
```

## Collecte d'informations

Merci de fournir:
1. ✅ Capture d'écran de la console après retour sur Tableau
2. ✅ Résultat de la requête SQL ci-dessus
3. ✅ Comportement observé vs attendu
