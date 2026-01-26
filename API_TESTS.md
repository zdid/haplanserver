# Tests API - Home Assistant Backend

## Introduction

Ce document décrit les tests à effectuer sur les endpoints API du backend Home Assistant.

## Configuration Requise

Avant de commencer les tests :

1. Assurez-vous que le serveur est démarré :
   ```bash
   cd testvibe5/server
   npm run dev
   ```

2. Configurez votre fichier `config/ha-config.json` avec une clé API valide

3. Assurez-vous que votre instance Home Assistant est accessible

## Endpoints à Tester

### 1. GET /api/data

**Description** : Récupère toutes les données initiales

**Requête** :
```bash
curl -X GET http://localhost:3000/api/data
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "tree": [
      {
        "id": "area_id",
        "name": "Nom de la zone",
        "devices": [
          {
            "id": "device_id",
            "name": "Nom de l'appareil",
            "entities": [
              {"entity_id": "entity_id"}
            ]
          }
        ]
      }
    ],
    "states": [
      {
        "entity_id": "entity_id",
        "state": "value",
        "attributes": {},
        "last_changed": "timestamp",
        "last_updated": "timestamp"
      }
    ],
    "config": {}
  }
}
```

### 2. GET /api/refresh

**Description** : Force un rafraîchissement complet des données

**Requête** :
```bash
curl -X GET http://localhost:3000/api/refresh
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Données rafraîchies"
}
```

### 3. POST /api/floorplan/upload

**Description** : Upload un fichier de plan d'étage

**Requête** :
```bash
curl -X POST http://localhost:3000/api/floorplan/upload \
  -F "floorplan=@/chemin/vers/votre/fichier.png"
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Fichier uploadé avec succès",
  "path": "/chemin/vers/fichier-uploadé.png"
}
```

### 4. POST /api/config/save

**Description** : Sauvegarde la configuration client

**Requête** :
```bash
curl -X POST http://localhost:3000/api/config/save \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark", "defaultView": "tree"}'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Configuration sauvegardée"
}
```

### 5. POST /api/entities/command

**Description** : Exécute une commande sur une entité

**Requête** :
```bash
curl -X POST http://localhost:3000/api/entities/command \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room", "service": "turn_on"}'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Commande exécutée"
}
```

### 6. GET /health

**Description** : Vérifie l'état de santé du serveur

**Requête** :
```bash
curl -X GET http://localhost:3000/health
```

**Réponse attendue** :
```json
{
  "status": "healthy",
  "timestamp": "2023-12-23T12:00:00.000Z"
}
```

## Tests WebSocket

### Connexion WebSocket

**Description** : Teste la connexion WebSocket et les mises à jour en temps réel

**Code JavaScript** :
```javascript
const socket = new WebSocket('ws://localhost:3000');

socket.onopen = () => {
  console.log('Connecté au serveur WebSocket');
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Message reçu:', data);
  
  // Exemple de traitement selon le type
  switch(data.type) {
    case 'update:tree':
      console.log('Mise à jour de l\'arborescence:', data.data);
      break;
    case 'update:state':
      console.log('Mise à jour de state:', data.data);
      break;
    case 'update:config':
      console.log('Mise à jour de config:', data.data);
      break;
    case 'update:floorplan':
      console.log('Mise à jour de plan:', data.data);
      break;
  }
};

socket.onerror = (error) => {
  console.error('Erreur WebSocket:', error);
};

socket.onclose = () => {
  console.log('Déconnecté du serveur WebSocket');
};
```

## Journal des Tests

Date: _____________

| Endpoint | Statut | Notes |
|----------|--------|-------|
| GET /api/data | ❌/✅ | |
| GET /api/refresh | ❌/✅ | |
| POST /api/floorplan/upload | ❌/✅ | |
| POST /api/config/save | ❌/✅ | |
| POST /api/entities/command | ❌/✅ | |
| GET /health | ❌/✅ | |
| WebSocket | ❌/✅ | |

## Problèmes Connus

1. **Erreur de connexion à Home Assistant** :
   - Vérifier que l'URL et la clé API sont correctes
   - Vérifier que Home Assistant est accessible depuis le serveur
   - Désactiver temporairement la vérification SSL si nécessaire

2. **Problèmes de cache** :
   - Vérifier que le TTL est correctement configuré
   - Forcer un rafraîchissement avec `/api/refresh` si nécessaire

3. **Problèmes de permissions** :
   - Vérifier les permissions sur le répertoire `config/`
   - Vérifier les permissions sur le répertoire `uploads/`

## Résultats Attendus

Après avoir exécuté tous les tests avec succès, vous devriez avoir :

1. Un serveur fonctionnel répondant à toutes les requêtes API
2. Des mises à jour en temps réel via WebSocket
3. Un cache mémoire fonctionnel pour les données
4. Une connexion stable à Home Assistant
5. Une journalisation appropriée des événements