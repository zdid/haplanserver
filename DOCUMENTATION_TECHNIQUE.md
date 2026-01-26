# Documentation Technique - Backend Home Assistant

## Table des Matières

1. [Aperçu du Projet](#1-aperçu-du-projet)
2. [Architecture Technique](#2-architecture-technique)
3. [Composants Principaux](#3-composants-principaux)
4. [Flux de Données](#4-flux-de-données)
5. [API REST](#5-api-rest)
6. [WebSocket](#6-websocket)
7. [Système de Cache](#7-système-de-cache)
8. [Configuration](#8-configuration)
9. [Sécurité](#9-sécurité)
10. [Journalisation](#10-journalisation)
11. [Gestion des Erreurs](#11-gestion-des-erreurs)
12. [Tests](#12-tests)
13. [Déploiement](#13-déploiement)
14. [Maintenance](#14-maintenance)
15. [Évolutivité](#15-évolutivité)
16. [Glossaire](#16-glossaire)

## 1. Aperçu du Projet

### 1.1 Description

Ce projet est un backend Node.js/TypeScript conçu pour interagir avec Home Assistant via l'API WebSocket. Il fournit une interface REST et des mises à jour en temps réel pour un client web.

### 1.2 Objectifs

- Fournir une interface unifiée pour accéder aux données Home Assistant
- Optimiser les performances en minimisant les requêtes à Home Assistant
- Assurer une synchronisation en temps réel des données
- Garantir la sécurité des informations sensibles
- Faciliter l'intégration avec des clients web

### 1.3 Fonctionnalités Clés

- Connexion sécurisée à Home Assistant
- Cache mémoire pour l'arborescence et les states
- API REST complète avec 6 endpoints
- Mises à jour en temps réel via WebSocket
- Gestion des configurations client
- Upload et gestion des plans d'étage

## 2. Architecture Technique

### 2.1 Schéma Global

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client    │    │    Backend      │    │  Home Assistant │
│   (Web)     │    │   (Node.js)     │    │    (Python)     │
└─────────────┘    └─────────────────┘    └─────────────────┘
       │                   │                         │
       │  REST/WebSocket   │  WebSocket              │
       │◄─────────────────►│◄───────────────────────►│
       │                   │                         │
```

### 2.2 Architecture en Couches

```
┌─────────────────────────────────────────────────┐
│                 Couche Présentation              │
│  ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Client    │    │      API REST          │  │
│  │   (Web)     │    │     (Express)          │  │
│  └─────────────┘    └─────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 Couche Métier                   │
│  ┌─────────────────────────┐    ┌─────────────┐  │
│  │   Services Métier      │    │   Cache     │  │
│  │   (HADataService)       │    │   (HACache) │  │
│  └─────────────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 Couche Données                  │
│  ┌─────────────────────────┐    ┌─────────────┐  │
│  │   Connexion HA         │    │  Fichiers   │  │
│  │   (HAConnection)       │    │  (Config)   │  │
│  └─────────────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.3 Technologies Utilisées

| Composant | Technologie | Version | Description |
|-----------|-------------|---------|-------------|
| Backend | Node.js | 16+ | Environnement d'exécution JavaScript |
| Framework | Express | 5.2.1 | Framework web pour Node.js |
| Langage | TypeScript | 5.9.3 | JavaScript typé |
| API HA | home-assistant-js-websocket | 9.6.0 | Bibliothèque pour l'API WebSocket HA |
| WebSocket | ws | 8.18.3 | Implémentation WebSocket |
| Configuration | dotenv | 17.2.3 | Gestion des variables d'environnement |
| Upload | multer | 2.0.2 | Middleware pour l'upload de fichiers |
| CORS | cors | 2.8.5 | Middleware pour CORS |
| Build | ts-node | 10.9.2 | Exécution directe de TypeScript |
| Build | nodemon | 3.1.11 | Rafraîchissement automatique |

## 3. Composants Principaux

### 3.1 HAConnection

**Fichier** : `src/core/ha-connection.ts`

**Responsabilités** :
- Gestion de la connexion WebSocket à Home Assistant
- Authentification avec `long_lived_access_token`
- Masquage des informations sensibles dans les logs
- Gestion des erreurs de connexion

**Méthodes** :
- `connect()` : Établit la connexion à Home Assistant
- `getConnection()` : Retourne l'instance de connexion

### 3.2 HACache

**Fichier** : `src/core/cache/ha-cache.ts`

**Responsabilités** :
- Implémentation générique du cache mémoire
- Gestion du TTL (Time To Live)
- Validation de la fraîcheur des données

**Méthodes** :
- `set(data)` : Stocke les données dans le cache
- `get()` : Récupère les données du cache
- `clear()` : Vide le cache
- `isValid()` : Vérifie si le cache est valide

### 3.3 TreeCache

**Fichier** : `src/core/cache/tree-cache.ts`

**Responsabilités** :
- Cache spécifique pour l'arborescence HA
- Construction de l'arborescence à partir des données HA
- Mise à jour du cache

**Méthodes** :
- `getTree(forceRefresh)` : Récupère l'arborescence
- `loadTreeFromHA()` : Charge l'arborescence depuis HA
- `updateCache()` : Met à jour le cache

### 3.4 StateCache

**Fichier** : `src/core/cache/state-cache.ts`

**Responsabilités** :
- Cache spécifique pour les states HA
- Écoute des mises à jour de states
- Mise à jour incrémentale du cache

**Méthodes** :
- `getAllStates(forceRefresh)` : Récupère tous les states
- `getState(entity_id)` : Récupère un state spécifique
- `updateState(state)` : Met à jour un state
- `startListening()` : Démarre l'écoute des événements

### 3.5 HADataService

**Fichier** : `src/services/ha-data-service.ts`

**Responsabilités** :
- Service principal pour les données HA
- Intégration des caches
- Initialisation des données

**Méthodes** :
- `initialize()` : Initialise les données
- `getTree()` : Récupère l'arborescence
- `getAllStates()` : Récupère tous les states
- `getState(entity_id)` : Récupère un state spécifique
- `refreshAll()` : Rafraîchit toutes les données

### 3.6 NotificationService

**Fichier** : `src/services/notification-service.ts`

**Responsabilités** :
- Gestion des clients WebSocket
- Broadcast des mises à jour
- Typage des messages

**Méthodes** :
- `addClient(client)` : Ajoute un client
- `removeClient(client)` : Retire un client
- `broadcastUpdate(type, data)` : Diffuse une mise à jour

### 3.7 ConfigManager

**Fichier** : `src/core/config-manager.ts`

**Responsabilités** :
- Chargement des configurations
- Fusion des configurations (env + fichiers)
- Validation des configurations
- Masquage des informations sensibles

**Méthodes** :
- `getHAConfig()` : Récupère la configuration HA (masquée)
- `getHAConnectionConfig()` : Récupère la configuration HA complète
- `getServerConfig()` : Récupère la configuration serveur
- `getClientConfig()` : Récupère la configuration client

### 3.8 Logger

**Fichier** : `src/utils/logger.ts`

**Responsabilités** :
- Journalisation centralisée
- Niveaux de log (error, warn, info, debug)
- Formatage des messages

**Méthodes** :
- `info(message, ...args)` : Log d'information
- `error(message, ...args)` : Log d'erreur
- `warn(message, ...args)` : Log d'avertissement
- `debug(message, ...args)` : Log de debug

## 4. Flux de Données

### 4.1 Flux Principal

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Client    │       │    Backend      │       │  Home Assistant │
└─────────────┘       └─────────────────┘       └─────────────────┘
       │                       │                         │
       │  1. Requête GET       │                         │
       │──────────────────────►│                         │
       │                       │                         │
       │                       │  2. Vérifie le cache    │
       │                       │◄───────────────────────►│
       │                       │                         │
       │                       │  3. Si cache invalide   │
       │                       │────────────────────────►│
       │                       │  4. Récupère données   │
       │                       │◄───────────────────────►│
       │                       │                         │
       │                       │  5. Met à jour le cache │
       │                       │◄───────────────────────►│
       │                       │                         │
       │  6. Retourne données  │                         │
       │◄──────────────────────│                         │
       │                       │                         │
```

### 4.2 Flux de Mise à Jour

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Home Assistant │       │    Backend      │       │   Client        │
└─────────────────┘       └─────────────────┘       └─────────────────┘
       │                       │                         │
       │  1. Événement         │                         │
       │──────────────────────►│                         │
       │  (state_changed)      │                         │
       │                       │                         │
       │                       │  2. Met à jour le cache │
       │                       │◄───────────────────────►│
       │                       │                         │
       │                       │  3. Broadcast aux       │
       │                       │────────────────────────►│
       │                       │    clients WebSocket    │
       │                       │                         │
```

## 5. API REST

### 5.1 Endpoints

| Méthode | Endpoint | Description | Authentification |
|---------|----------|-------------|------------------|
| GET | /api/data | Récupère toutes les données | Non |
| GET | /api/refresh | Rafraîchit le cache | Non |
| POST | /api/floorplan/upload | Upload un plan | Non |
| POST | /api/config/save | Sauvegarde la config | Non |
| POST | /api/entities/command | Exécute une commande | Non |
| GET | /health | Vérifie l'état du serveur | Non |

### 5.2 Réponses Standard

**Succès** :
```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

**Erreur** :
```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

### 5.3 Codes HTTP

| Code | Description |
|------|-------------|
| 200 | Succès |
| 400 | Requête invalide |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

## 6. WebSocket

### 6.1 Connexion

**URL** : `ws://localhost:3000`

**Événements** :
- `open` : Connexion établie
- `message` : Message reçu
- `error` : Erreur de connexion
- `close` : Connexion fermée

### 6.2 Types de Messages

**Mise à jour de l'arborescence** :
```json
{
  "type": "update:tree",
  "timestamp": 1234567890,
  "data": {}
}
```

**Mise à jour de state** :
```json
{
  "type": "update:state",
  "timestamp": 1234567890,
  "data": {
    "entity_id": "light.living_room",
    "new_state": {
      "state": "on",
      "attributes": {}
    }
  }
}
```

**Mise à jour de configuration** :
```json
{
  "type": "update:config",
  "timestamp": 1234567890,
  "data": {}
}
```

**Mise à jour de plan** :
```json
{
  "type": "update:floorplan",
  "timestamp": 1234567890,
  "data": {
    "path": "/uploads/floorplan.png",
    "filename": "floorplan.png"
  }
}
```

## 7. Système de Cache

### 7.1 Stratégie de Cache

**Type** : Cache mémoire (in-memory)

**TTL** : 300000 ms (5 minutes)

**Stratégie** :
- Chargement initial complet au démarrage
- Rafraîchissement complet sur demande (`/api/refresh`)
- Mises à jour incrémentales via événements WebSocket

### 7.2 Avantages

- Réduction des requêtes à Home Assistant
- Temps de réponse amélioré
- Expérience utilisateur fluide
- Réduction de la charge sur Home Assistant

### 7.3 Limitations

- Cache non persistant entre redémarrages
- Consommation mémoire accrue
- Nécessite une synchronisation précise

## 8. Configuration

### 8.1 Fichiers de Configuration

**`config/ha-config.json`** :
```json
{
  "homeAssistant": {
    "apiKey": "votre_cle_api",
    "url": "ws://votre_home_assistant:8123",
    "verifySSL": true,
    "reconnectInterval": 5000
  }
}
```

**`config/server-config.json`** :
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "staticFiles": "./public",
    "maxUploadSize": "10mb",
    "logLevel": "info"
  },
  "paths": {
    "configDir": "./config",
    "uploadDir": "./uploads"
  }
}
```

**`config/client-config.json`** :
```json
{
  "client": {
    "defaultView": "tree",
    "refreshInterval": 30000,
    "theme": "default",
    "floorplan": {
      "showLabels": true,
      "iconSize": "medium"
    }
  }
}
```

### 8.2 Variables d'Environnement

**`.env`** :
```env
HA_API_KEY=votre_cle_api
HA_URL=ws://votre_home_assistant:8123
HA_VERIFY_SSL=true
HA_RECONNECT_INTERVAL=5000
LOG_LEVEL=info
```

### 8.3 Priorité des Configurations

1. Variables d'environnement
2. Fichiers de configuration
3. Valeurs par défaut

## 9. Sécurité

### 9.1 Mesures de Sécurité

**Protection des Données** :
- Répertoire `config/` exclu de Git
- Masquage des clés dans les logs
- Validation des configurations
- Permissions restrictives sur les fichiers

**Authentification** :
- Utilisation de `long_lived_access_token`
- Pas de stockage des mots de passe
- Connexion sécurisée à Home Assistant

**Communication** :
- HTTPS recommandé en production
- Vérification SSL configurable
- Protection contre les attaques CSRF

### 9.2 Bonnes Pratiques

- Rotater régulièrement la clé API
- Limiter les permissions du token HA
- Utiliser des variables d'environnement
- Ne pas logger les informations sensibles
- Valider toutes les entrées utilisateur

## 10. Journalisation

### 10.1 Niveaux de Log

- **ERROR** : Erreurs critiques
- **WARN** : Avertissements
- **INFO** : Informations générales
- **DEBUG** : Informations de debug

### 10.2 Format des Logs

```
[LEVEL] YYYY-MM-DDTHH:MM:SS.sssZ - Message
```

### 10.3 Exemples

```
[INFO] 2023-12-23T12:00:00.000Z - Démarrage du serveur Home Assistant...
[INFO] 2023-12-23T12:00:01.000Z - Configuration chargée
[INFO] 2023-12-23T12:00:02.000Z - Connecté à Home Assistant à ws://homeassistant:8123
[INFO] 2023-12-23T12:00:03.000Z - Serveur démarré sur http://localhost:3000
```

## 11. Gestion des Erreurs

### 11.1 Types d'Erreurs

**Erreurs de Connexion** :
- Échec de connexion à Home Assistant
- Clé API invalide
- URL invalide

**Erreurs de Cache** :
- Cache expiré
- Données corrompues
- Échec de mise à jour

**Erreurs API** :
- Requête invalide
- Paramètres manquants
- Ressource non trouvée

### 11.2 Gestion des Erreurs

**Stratégie** :
- Journalisation des erreurs
- Messages d'erreur clairs
- Codes HTTP appropriés
- Reprise automatique si possible

**Exemple** :
```typescript
try {
  // Code susceptible de générer une erreur
} catch (error) {
  logger.error("Erreur:", error);
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : 'Erreur inconnue'
  });
}
```

## 12. Tests

### 12.1 Types de Tests

**Tests Unitaires** :
- Tests des fonctions individuelles
- Tests des classes
- Tests des utilitaires

**Tests d'Intégration** :
- Tests des endpoints API
- Tests des flux de données
- Tests des interactions entre composants

**Tests End-to-End** :
- Tests complets du système
- Tests des scénarios utilisateur
- Tests des performances

### 12.2 Outils de Test

- **Jest** : Tests unitaires et d'intégration
- **Supertest** : Tests des endpoints API
- **Mocha** : Framework de test
- **Chai** : Assertions
- **Sinon** : Mocks et stubs

### 12.3 Exemples de Tests

**Test Unitaire** :
```typescript
import HACache from './ha-cache';

describe('HACache', () => {
  it('should set and get data', () => {
    const cache = new HACache();
    cache.set({ test: 'data' });
    expect(cache.get()).toEqual({ test: 'data' });
  });

  it('should expire data after TTL', (done) => {
    const cache = new HACache(100);
    cache.set({ test: 'data' });
    setTimeout(() => {
      expect(cache.get()).toBeNull();
      done();
    }, 150);
  });
});
```

**Test d'Intégration** :
```typescript
import request from 'supertest';
import app from '../src/index';

describe('GET /api/data', () => {
  it('should return data', async () => {
    const res = await request(app)
      .get('/api/data')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('tree');
    expect(res.body.data).toHaveProperty('states');
  });
});
```

## 13. Déploiement

### 13.1 Prérequis

- Node.js 16+
- npm/yarn
- Accès à Home Assistant
- Clé API valide

### 13.2 Étapes de Déploiement

1. **Build** :
```bash
cd server
npm run build
```

2. **Configurer** :
```bash
cp config/ha-config.json.example config/ha-config.json
# Éditer config/ha-config.json
```

3. **Démarrer** :
```bash
npm start
```

### 13.3 Recommandations

- Utiliser PM2 pour la gestion des processus
- Configurer un reverse proxy (Nginx/Apache)
- Activer HTTPS
- Surveiller l'utilisation mémoire
- Configurer des sauvegardes régulières

### 13.4 Configuration PM2

**`ecosystem.config.js`** :
```javascript
module.exports = {
  apps: [{
    name: 'ha-server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    }
  }]
};
```

**Commandes** :
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 14. Maintenance

### 14.1 Mises à Jour

1. **Mettre à jour les dépendances** :
```bash
npm update
```

2. **Reconstruire le projet** :
```bash
npm run build
```

3. **Redémarrer le serveur** :
```bash
pm2 restart ha-server
```

### 14.2 Surveillance

- **Logs** : Surveiller les logs pour les erreurs
- **Mémoire** : Surveiller l'utilisation mémoire
- **Performances** : Surveiller les temps de réponse
- **Disponibilité** : Surveiller la disponibilité du serveur

### 14.3 Sauvegardes

- Sauvegarder régulièrement le répertoire `config/`
- Sauvegarder la base de données (si applicable)
- Sauvegarder les logs importants
- Tester les sauvegardes régulièrement

### 14.4 Journalisation

- Archiver les logs régulièrement
- Analyser les logs pour détecter les problèmes
- Configurer des alertes pour les erreurs critiques
- Nettoyer les anciens logs

## 15. Évolutivité

### 15.1 Stratégies d'Évolutivité

**Verticale** :
- Augmenter la mémoire
- Augmenter le CPU
- Optimiser le code

**Horizontale** :
- Ajouter des instances
- Utiliser un load balancer
- Partager le cache (Redis)

### 15.2 Optimisations

**Cache** :
- Utiliser Redis pour un cache distribué
- Optimiser le TTL
- Implémenter un cache à deux niveaux

**Base de Données** :
- Optimiser les requêtes
- Utiliser des index
- Partitionner les données

**Code** :
- Optimiser les algorithmes
- Réduire la consommation mémoire
- Utiliser des streams pour les gros fichiers

### 15.3 Limitations Actuelles

- Cache mémoire non distribué
- Pas de load balancing
- Pas de haute disponibilité
- Scalabilité limitée par la mémoire

### 15.4 Améliorations Futures

- Implémenter Redis pour le cache
- Ajouter un load balancer
- Implémenter la haute disponibilité
- Optimiser la consommation mémoire

## 16. Glossaire

**API** : Application Programming Interface - Interface de programmation

**CORS** : Cross-Origin Resource Sharing - Partage de ressources entre origines

**CRUD** : Create, Read, Update, Delete - Opérations de base sur les données

**HA** : Home Assistant - Plateforme de domotique

**JSON** : JavaScript Object Notation - Format de données

**REST** : Representational State Transfer - Style d'architecture API

**TTL** : Time To Live - Durée de vie des données en cache

**WebSocket** : Protocole de communication temps réel

**SSL** : Secure Sockets Layer - Protocole de sécurité

**TLS** : Transport Layer Security - Protocole de sécurité

**CORS** : Cross-Origin Resource Sharing - Partage de ressources entre origines

**JWT** : JSON Web Token - Token d'authentification

**OAuth** : Open Authorization - Protocole d'authentification

**CORS** : Cross-Origin Resource Sharing - Partage de ressources entre origines

**CORS** : Cross-Origin Resource Sharing - Partage de ressources entre origines

**CORS** : Cross-Origin Resource Sharing - Partage de ressources entre origines