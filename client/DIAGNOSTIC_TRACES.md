# Guide de Diagnostic - Traces de l'Application Client

## Introduction

Ce document explique comment utiliser les traces de diagnostic intégrées dans l'application client pour identifier et résoudre les problèmes de communication avec le serveur.

## Activation des Traces

Les traces sont activées par défaut dans le bundle de production. Vous pouvez les désactiver en modifiant la configuration :

```javascript
const CONFIG = {
  // ...
  DEBUG: false // Désactive les traces
};
```

## Types de Traces

### 1. Traces d'Information (INFO)
- **Couleur** : Vert
- **Utilisation** : Événements importants et succès
- **Exemple** : Connexion réussie, chargement de données

### 2. Traces d'Erreur (ERROR)
- **Couleur** : Rouge
- **Utilisation** : Erreurs et échecs
- **Exemple** : Échec de connexion, erreurs API

### 3. Traces d'Avertissement (WARN)
- **Couleur** : Orange
- **Utilisation** : Situations potentiellement problématiques
- **Exemple** : Déconnexion WebSocket, actions non autorisées

### 4. Traces de Debug (DEBUG)
- **Couleur** : Bleu
- **Utilisation** : Informations détaillées pour le développement
- **Exemple** : Données brutes, détails techniques

## Problèmes Courants et Diagnostic

### 1. Problème d'Upload de Plan

**Symptômes** : 
- L'upload échoue sans message d'erreur clair
- Le plan n'apparaît pas après upload

**Traces à vérifier** :
```
[INFO] API Request: POST http://localhost:3000/api/floorplan/upload
[DEBUG] FormData created: {...}
[INFO] API Response: POST http://localhost:3000/api/floorplan/upload
[DEBUG] Raw response text: "..."
```

**Diagnostic** :
1. Vérifier que l'URL est correcte
2. Vérifier que le FormData contient bien le fichier
3. Vérifier la réponse brute du serveur
4. Vérifier que la réponse JSON est valide

**Solutions possibles** :
- Le serveur renvoie peut-être un chemin relatif au lieu d'absolu
- Le serveur peut avoir un problème de permissions sur le répertoire d'upload
- Le chemin retourné par le serveur peut être incorrect

### 2. Problème de Chargement du Plan

**Symptômes** :
- Le plan ne s'affiche pas après chargement
- Erreur 404 dans la console

**Traces à vérifier** :
```
[INFO] Initialization: Floorplan found
[INFO] Initialization: Loading floorplan
[INFO] FloorplanRenderer: Loading plan
[ERROR] FloorplanRenderer: Failed to load plan image
```

**Diagnostic** :
1. Vérifier le chemin original retourné par le serveur
2. Vérifier le chemin complet construit
3. Vérifier si le chemin est absolu ou relatif
4. Tester l'URL directement dans le navigateur

**Solutions possibles** :
- Le serveur renvoie un chemin relatif qui n'est pas correctement interprété
- Le serveur peut avoir un problème de configuration des chemins statiques
- Le fichier peut ne pas être accessible publiquement

### 3. Problème de Communication WebSocket

**Symptômes** :
- Pas de mises à jour en temps réel
- Déconnexions fréquentes

**Traces à vérifier** :
```
[INFO] WebSocket: Connecting to ws://localhost:3000
[INFO] WebSocket: Connected successfully
[WARN] WebSocket: Disconnected
[INFO] WebSocket: Attempting to reconnect...
```

**Diagnostic** :
1. Vérifier que l'URL WebSocket est correcte
2. Vérifier les tentatives de reconnexion
3. Vérifier les messages reçus et envoyés

**Solutions possibles** :
- Le serveur WebSocket peut ne pas être démarré
- Problème de CORS
- Problème de réseau

## Exemple de Session de Diagnostic

### Scénario : Upload de plan échoué

**Traces observées** :
```
[2023-12-29T10:00:00.000Z] [INFO] API Request: POST http://localhost:3000/api/floorplan/upload
[2023-12-29T10:00:00.010Z] [DEBUG] FormData created: {"entries":[{"floorplan":"[object File]"}]}
[2023-12-29T10:00:00.500Z] [INFO] API Response: POST http://localhost:3000/api/floorplan/upload
                    - Data: {"status":200,"statusText":"OK","duration":"490ms"}
[2023-12-29T10:00:00.510Z] [DEBUG] Raw response text: "{\"success\":true,\"data\":{\"path\":\"uploads/floorplan.png\"}}"
[2023-12-29T10:00:00.520Z] [DEBUG] Parsed response data: {"success":true,"data":{"path":"uploads/floorplan.png"}}
[2023-12-29T10:00:00.530Z] [INFO] File uploaded successfully
[2023-12-29T10:00:00.540Z] [INFO] Initialization: Floorplan found
                    - Data: {"path":"uploads/floorplan.png","isAbsolute":false}
[2023-12-29T10:00:00.550Z] [INFO] Initialization: Loading floorplan
                    - Data: {"originalPath":"uploads/floorplan.png","fullPath":"http://localhost:3000/uploads/floorplan.png"}
[2023-12-29T10:00:00.560Z] [INFO] FloorplanRenderer: Loading plan
                    - Data: {"imagePath":"http://localhost:3000/uploads/floorplan.png","fullUrl":"http://localhost:3000/uploads/floorplan.png"}
[2023-12-29T10:00:00.600Z] [ERROR] FloorplanRenderer: Failed to load plan image
                    - Data: {"imagePath":"http://localhost:3000/uploads/floorplan.png"}
```

**Analyse** :
1. L'upload a réussi (success: true)
2. Le serveur a retourné un chemin relatif : `uploads/floorplan.png`
3. Le client a construit l'URL complète : `http://localhost:3000/uploads/floorplan.png`
4. Le chargement de l'image a échoué

**Solution** :
- Vérifier que le répertoire `uploads` est accessible publiquement sur le serveur
- Vérifier que le fichier existe bien à cet emplacement
- Tester l'URL directement dans le navigateur : `http://localhost:3000/uploads/floorplan.png`

## Configuration du Serveur

### Répertoires Recommandés

Pour éviter les problèmes de chemins, voici une configuration recommandée :

**Upload de plans** :
- Répertoire : `/uploads/floorplans/`
- URL publique : `http://localhost:3000/uploads/floorplans/`

**Accès aux plans** :
- Répertoire : `/public/plans/`
- URL publique : `http://localhost:3000/plans/`

### Configuration Express

```javascript
// Configuration des répertoires statiques
app.use('/uploads', express.static('uploads'));
app.use('/plans', express.static('public/plans'));

// Endpoint d'upload
app.post('/api/floorplan/upload', (req, res) => {
  // ... logique d'upload ...
  
  // Retourner un chemin absolu ou un chemin relatif correct
  res.json({
    success: true,
    data: {
      path: `/plans/${filename}` // Chemin relatif
      // ou
      // path: `http://localhost:3000/plans/${filename}` // Chemin absolu
    }
  });
});
```

## Bonnes Pratiques

1. **Chemins absolus** : Préférez les chemins absolus pour éviter les problèmes de résolution
2. **Validation** : Validez toujours les chemins retournés par le serveur
3. **Logs** : Activez les logs en production pour le diagnostic
4. **Tests** : Testez les URLs directement dans le navigateur
5. **Documentation** : Documentez les endpoints et les chemins attendus

## Résolution des Problèmes

### Problème : Chemin incorrect après upload

**Solution 1** : Modifier le serveur pour retourner un chemin absolu
```javascript
// Serveur
res.json({
  success: true,
  data: {
    path: `http://${req.headers.host}/plans/${filename}`
  }
});
```

**Solution 2** : Modifier le client pour construire correctement l'URL
```javascript
// Client
const fullPath = data.path.startsWith('http') 
  ? data.path 
  : `${CONFIG.API_BASE_URL}/plans/${data.path}`;
```

### Problème : Répertoire d'upload non accessible

**Solution** : Vérifier la configuration des middlewares statiques
```javascript
// Assurez-vous que le répertoire est servi statiquement
app.use('/plans', express.static('public/plans'));
```

### Problème : CORS

**Solution** : Configurer CORS sur le serveur
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:9000' // ou votre domaine client
}));
```

## Conclusion

Les traces de diagnostic intégrées fournissent une visibilité complète sur les communications entre le client et le serveur. En suivant ce guide, vous devriez être en mesure d'identifier et de résoudre la plupart des problèmes courants.

Pour des problèmes plus complexes, n'hésitez pas à :
1. Vérifier les logs côté serveur
2. Tester les endpoints avec Postman ou curl
3. Inspecter le trafic réseau avec les outils de développement du navigateur
4. Vérifier la configuration du serveur
