# Corrections des Problèmes de Chemins d'Accès

## Problème Identifié

Le serveur renvoie des chemins relatifs pour les plans (ex: `uploads/c883638b0a05075974c89fde01da990a`) mais le client ne les interprète pas correctement, ce qui entraîne des erreurs 404 lors du chargement des images.

## Solutions Implémentées

### 1. Correction dans le Service API (`api-service.ts`)

**Problème** : Le service API ne vérifiait pas si le chemin retourné par le serveur était absolu ou relatif.

**Solution** : 
```typescript
// Vérifier et corriger le chemin si nécessaire
if (data.data && data.data.path) {
  if (!data.data.path.startsWith('http')) {
    // Si le chemin est relatif, le rendre absolu
    data.data.path = `${this.baseUrl}/${data.data.path}`;
    console.log('API Service: Corrected relative path to absolute:', data.data.path);
  }
}
```

**Avantages** :
- Conversion automatique des chemins relatifs en absolus
- Compatibilité avec les deux types de réponses du serveur
- Logs clairs pour le diagnostic

### 2. Correction dans le Contrôleur (`floorplan-controller.ts`)

**Problème** : Le contrôleur ne gérait pas la construction des URLs complètes.

**Solution** :
```typescript
// Vérifier si le chemin est absolu ou relatif
const fullPath = floorplanPath.startsWith('http') 
  ? floorplanPath 
  : `${this.apiService['baseUrl']}/${floorplanPath}`;

console.log('Loading floorplan from:', fullPath);
this.floorplanRenderer.renderPlan(fullPath);
```

**Avantages** :
- Construction explicite de l'URL complète
- Gestion des deux cas (absolu et relatif)
- Logs pour le suivi

### 3. Correction dans le Renderer (`floorplan-renderer.ts`)

**Problème** : Le renderer n'avait pas de gestion d'erreur pour le chargement des images.

**Solution** :
```typescript
renderPlan(imagePath: string): void {
  console.log('FloorplanRenderer: Loading plan from', imagePath);
  
  this.planElement.src = imagePath;
  
  this.planElement.onload = () => {
    console.log('FloorplanRenderer: Plan loaded successfully');
    this.resizeToFitContainer();
  };
  
  this.planElement.onerror = () => {
    console.error('FloorplanRenderer: Failed to load plan image from', imagePath);
  };
}
```

**Avantages** :
- Détection des erreurs de chargement
- Logs pour le diagnostic
- Feedback immédiat en cas d'échec

## Configuration Recommandée du Serveur

Pour éviter ces problèmes, voici la configuration recommandée côté serveur :

### Option 1 : Retourner des chemins absolus

```javascript
// Dans l'endpoint d'upload
app.post('/api/floorplan/upload', (req, res) => {
  // ... logique d'upload ...
  
  res.json({
    success: true,
    data: {
      path: `http://${req.headers.host}/uploads/${filename}` // Chemin absolu
    }
  });
});
```

### Option 2 : Retourner des chemins relatifs avec endpoint dédié

```javascript
// Configuration Express
app.use('/api/plans', express.static('uploads'));

// Dans l'endpoint d'upload
app.post('/api/floorplan/upload', (req, res) => {
  // ... logique d'upload ...
  
  res.json({
    success: true,
    data: {
      path: `/api/plans/${filename}` // Chemin relatif mais avec endpoint dédié
    }
  });
});
```

## Bonnes Pratiques

### Côté Client

1. **Toujours vérifier** si un chemin est absolu ou relatif
2. **Construire les URLs complètes** avant de les utiliser
3. **Gérer les erreurs** de chargement des ressources
4. **Logger les opérations** pour le diagnostic

### Côté Serveur

1. **Être cohérent** dans le format des chemins retournés
2. **Préférer les chemins absolus** pour éviter les ambiguïtés
3. **Documenter** le format attendu
4. **Valider** les chemins avant de les retourner

## Diagnostic des Problèmes

### Vérifier les logs

1. **Upload** :
```
API Service: Uploading floorplan
API Service: Raw upload response:
API Service: Corrected relative path to absolute:
```

2. **Chargement** :
```
FloorplanController: Floorplan found
FloorplanController: Loading floorplan from:
FloorplanRenderer: Loading plan from
FloorplanRenderer: Plan loaded successfully
// ou
FloorplanRenderer: Failed to load plan image from
```

### Tester les URLs

1. Ouvrir l'URL dans le navigateur
2. Vérifier les headers HTTP
3. Vérifier les permissions

### Vérifier la configuration

1. **Côté client** : `APIService.baseUrl` est-il correct ?
2. **Côté serveur** : Les middlewares statiques sont-ils configurés ?
3. **CORS** : Les en-têtes CORS sont-ils corrects ?

## Exemple de Correction

### Avant
```
// Serveur renvoie: "uploads/plan.png"
// Client utilise directement: "uploads/plan.png"
// Résultat: Erreur 404
```

### Après
```
// Serveur renvoie: "uploads/plan.png"
// Client vérifie et corrige: "http://localhost:3000/uploads/plan.png"
// Résultat: Chargement réussi
```

## Conclusion

Les corrections apportées garantissent que :

1. Les chemins relatifs sont automatiquement convertis en absolus
2. Les erreurs de chargement sont détectées et loggées
3. Le diagnostic des problèmes est facilité
4. L'application est plus robuste face aux différentes configurations serveur

Pour une solution définitive, il est recommandé de standardiser le format des chemins côté serveur (préférentiellement des chemins absolus).
