// Script de test pour vérifier le flow de reload
console.log('Test du mécanisme de reload:')
console.log('1. location.pathname change de /edition à /tableau')
console.log('2. prevPathRef.current !== null && prevPathRef.current !== "/tableau"')
console.log('3. setReloadKey(prev => prev + 1)')
console.log('4. useTachesDnd reçoit nouveau reloadKey')
console.log('5. loadTaches() se déclenche avec .eq("aujourdhui", true)')
