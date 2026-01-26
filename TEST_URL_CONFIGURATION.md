# Configuration pour les Tests via URL

## Introduction

Ce document explique comment configurer et tester l'application via une adresse URL plutôt que localhost.

## Configuration du Serveur

### 1. Modifier le fichier `server/src/index.ts`

Le serveur est maintenant configuré pour écouter sur toutes les interfaces réseau (`0.0.0.0`) au lieu de `localhost`.

**Modifications apportées** :
```typescript
const port = serverConfig.server.port || 3000;
const host = serverConfig.server.host || '0.0.0.0';

server.listen(port, host, () => {
  logger.info(`Serveur démarré sur http://${host}:${port}`);
  logger.info(`Accessible via:`);
  logger.info(`- http://localhost:${port}`);
  logger.info(`- http://${require('os').networkInterfaces().eth0[0].address}:${port}`);
});
```

### 2. Configurer le fichier `server-config.json`

Assurez-vous que votre fichier de configuration contient :
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

## Configuration du Client

### 1. Modifier le fichier `client/dist/bundle.js`

Le client est maintenant configuré pour se connecter à l'URL du serveur plutôt qu'à localhost.

**Modifications apportées** :
```javascript
const SERVER_IP = window.location.hostname || 'localhost';
const SERVER_PORT = window.location.port || '3000';

const CONFIG = {
  API_BASE_URL: `http://${SERVER_IP}:${SERVER_PORT}`,
  WS_BASE_URL: `ws://${SERVER_IP}:${SERVER_PORT}`,
  // ...
};
```

## Configuration Réseau

### 1. Trouver l'adresse IP de votre serveur

**Sur Linux/Mac** :
```bash
hostname -I
# ou
ifconfig | grep "inet "
```

**Sur Windows** :
```bash
ipconfig
```

### 2. Configurer le pare-feu

Assurez-vous que le port 3000 est ouvert dans le pare-feu :

**Sur Linux (UFW)** :
```bash
sudo ufw allow 3000/tcp
```

**Sur Windows** :
- Ouvrir le Pare-feu Windows
- Ajouter une règle entrante pour le port 3000

## Configuration CORS

Le serveur est déjà configuré avec CORS pour accepter les requêtes de n'importe quelle origine :

```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
```

## Procédure de Test

### 1. Démarrer le serveur

```bash
cd server
npm run dev
```

### 2. Trouver l'adresse IP du serveur

Exécutez la commande appropriée pour votre système (voir ci-dessus).

### 3. Accéder au client

Ouvrez le fichier `client/test.html` dans un navigateur.

Le client détectera automatiquement l'adresse IP et le port du serveur.

### 4. Vérifier les logs

**Côté serveur** :
```
Serveur démarré sur http://0.0.0.0:3000
Accessible via:
- http://localhost:3000
- http://192.168.1.100:3000
```

**Côté client** :
```
Client Configuration: {
  API_BASE_URL: "http://192.168.1.100:3000",
  WS_BASE_URL: "ws://192.168.1.100:3000"
}
```

## Résolution des Problèmes

### 1. Problème : Impossible de se connecter au serveur

**Solutions** :
- Vérifier que le serveur est démarré
- Vérifier que le pare-feu autorise le port 3000
- Vérifier que l'adresse IP est correcte
- Vérifier que le client et le serveur sont sur le même réseau

### 2. Problème : CORS bloqué

**Solutions** :
- Vérifier que le middleware CORS est configuré
- Vérifier que le serveur écoute sur `0.0.0.0`
- Vérifier que l'URL du client est correcte

### 3. Problème : WebSocket ne se connecte pas

**Solutions** :
- Vérifier que l'URL WebSocket est correcte
- Vérifier que le serveur WebSocket est démarré
- Vérifier que le pare-feu autorise les connexions WebSocket

## Configuration pour la Production

### 1. Utiliser HTTPS

Pour la production, utilisez HTTPS :

```typescript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(port, host, () => {
  logger.info(`Serveur démarré sur https://${host}:${port}`);
});
```

### 2. Configurer un reverse proxy

Utilisez Nginx ou Apache pour :
- Terminer SSL
- Gérer les en-têtes CORS
- Protéger contre les attaques

**Exemple de configuration Nginx** :
```nginx
server {
  listen 80;
  server_name votre-domaine.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 3. Configurer des variables d'environnement

Utilisez des variables d'environnement pour la configuration :

```typescript
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
```

## Conclusion

Avec ces configurations, vous pouvez maintenant :

1. **Tester localement** : `http://localhost:3000`
2. **Tester sur le réseau local** : `http://192.168.1.X:3000`
3. **Déployer en production** : `https://votre-domaine.com`

Si vous avez besoin d'aide pour configurer un environnement spécifique, n'hésitez pas à demander !
