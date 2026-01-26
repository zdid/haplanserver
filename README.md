# Projet Home Assistant - Backend

## Description

Backend Node.js/TypeScript pour interagir avec Home Assistant via WebSocket. Fournit une API REST et des mises à jour temps réel pour un client web.

## Structure du Projet

```
testvibe5/
├── EXPRESSION_DES_BESOINS.md
├── DOCUMENTATION_TECHNIQUE.md
├── API_TESTS.md
├── API_RESULTS.md
├── README.md
├── .gitignore
├── init-config.sh
├── config/
│   ├── ha-config.json.example
│   ├── server-config.json
│   └── client-config.json
├── server/
│   ├── src/
│   │   ├── core/
│   │   │   ├── cache/
│   │   │   │   ├── ha-cache.ts
│   │   │   │   ├── tree-cache.ts
│   │   │   │   └── state-cache.ts
│   │   │   ├── config-manager.ts
│   │   │   └── ha-connection.ts
│   │   ├── services/
│   │   │   ├── ha-data-service.ts
│   │   │   └── notification-service.ts
│   │   ├── types/
│   │   │   ├── ha-types.ts
│   │   │   └── api-types.ts
│   │   ├── utils/
│   │   │   └── logger.ts
│   │   ├── index.ts
│   │   └── routes.ts
│   ├── package.json
│   └── tsconfig.json
└── init-config.sh
```

## Installation

### Prérequis
- Node.js 16+
- npm/yarn
- Instance Home Assistant accessible
- Clé API Home Assistant (long lived access token)

### Étapes

1. **Initialiser la configuration** :
```bash
chmod +x init-config.sh
./init-config.sh
```

2. **Configurer Home Assistant** :
```bash
cp config/ha-config.json.example config/ha-config.json
# Éditer config/ha-config.json avec vos informations
```

3. **Installer les dépendances** :
```bash
cd server
npm install
```

## Configuration

### Fichiers de Configuration

1. **`config/ha-config.json`** :
```json
{
  "homeAssistant": {
    "apiKey": "votre_cle_api",
    "url": "ws://votre_home_assistant:8123",
    "verifySSL": true
  }
}
```

2. **`config/server-config.json`** :
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

3. **Variables d'environnement** (optionnel) :
```env
HA_API_KEY=votre_cle_api
HA_URL=ws://votre_home_assistant:8123
```

## Utilisation

### Développement

```bash
# Démarrer en mode développement (avec rafraîchissement automatique)
cd server
npm run dev
```

### Production

```bash
# Build
cd server
npm run build

# Démarrer
npm start
```

## API Endpoints

### GET /api/data
Retourne toutes les données initiales :
- Arborescence (areas/devices/entities)
- Liste complète des states
- Configuration client

### GET /api/refresh
Force un rafraîchissement complet des données depuis Home Assistant.

### POST /api/floorplan/upload
Upload d'un fichier de plan d'étage.

### POST /api/config/save
Sauvegarde de la configuration client.

### POST /api/entities/command
Exécution d'une commande sur une entité Home Assistant.

### GET /health
Vérifie l'état de santé du serveur.

## WebSocket

Le serveur expose un endpoint WebSocket pour les mises à jour temps réel :

```javascript
const socket = new WebSocket('ws://localhost:3000');

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Traiter les mises à jour
};
```

Types de messages :
- `update:tree` : Mise à jour de l'arborescence
- `update:state` : Mise à jour d'un state
- `update:config` : Mise à jour de la configuration
- `update:floorplan` : Mise à jour du plan

## Documentation

- **Expression des Besoins** : Voir `EXPRESSION_DES_BESOINS.md`
- **Documentation Technique** : Voir `DOCUMENTATION_TECHNIQUE.md`
- **Tests API** : Voir `API_TESTS.md`
- **Résultats des Tests** : Voir `API_RESULTS.md`

## Déploiement

### Recommandations

1. Utiliser PM2 pour la gestion des processus :
```bash
npm install -g pm2
pm2 start dist/index.js --name ha-server
```

2. Configurer un reverse proxy (Nginx/Apache) pour :
   - HTTPS
   - Gestion des en-têtes CORS
   - Protection contre les attaques

3. Surveiller l'utilisation mémoire (le cache peut consommer de la RAM)

## Maintenance

### Mises à jour

1. Mettre à jour les dépendances :
```bash
npm update
```

2. Reconstruire le projet :
```bash
npm run build
```

3. Redémarrer le serveur

### Sauvegardes

- Sauvegarder régulièrement le répertoire `config/`
- Exporter les configurations importantes

## Contribution

Les contributions sont les bienvenues. Pour contribuer :

1. Forker le projet
2. Créer une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Commiter vos changements (`git commit -am 'Ajout de ma fonctionnalite'`)
4. Pousser la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence ISC.