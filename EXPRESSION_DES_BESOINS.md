# Expression des Besoins Détaillée

## 1. Contexte du Projet
Développement d'un serveur backend pour une application Home Assistant qui doit :
- Fournir une interface entre un client web et Home Assistant
- Optimiser les performances en minimisant les requêtes à Home Assistant
- Assurer une synchronisation temps réel des données
- Garantir la sécurité des informations sensibles

## 2. Fonctionnalités Principales

### 2.1. Authentification
- **Exigence** : Utilisation exclusive de `long_lived_access_token` (clé API Home Assistant)
- **Stockage** : Fichier de configuration local exclu du contrôle de version
- **Sécurité** :
  - Masquage des clés dans les logs
  - Validation de la configuration au démarrage
  - Support des variables d'environnement

### 2.2. Données à Exposer
- **Arborescence** :
  - Structure hiérarchique : Areas → Appareils → Entités
  - Format JSON standardisé
  - Mise à jour automatique en cas de changements

- **States** :
  - Liste complète des états des entités
  - Mises à jour incrémentales en temps réel
  - Cache mémoire pour performances

- **Configuration Client** :
  - Fichier paramétrable par l'utilisateur
  - Persistance des préférences
  - Notification des changements

- **Plan d'Étage** :
  - Upload et stockage de fichiers
  - Chemin configurable
  - Diffusion aux clients connectés

### 2.3. Services REST
| Endpoint | Méthode | Description | Paramètres | Retour |
|----------|---------|-------------|------------|--------|
| `/api/data` | GET | Données initiales complètes | - | Arborescence + States + Config |
| `/api/refresh` | GET | Rafraîchissement complet | - | Confirmation |
| `/api/floorplan/upload` | POST | Upload d'un plan | fichier | Confirmation + chemin |
| `/api/config/save` | POST | Sauvegarde config | config | Confirmation |
| `/api/entities/command` | POST | Commande entité | entity_id, service, data | Résultat |

### 2.4. Flux Temps Réel
- **WebSocket** :
  - Connexion persistante avec les clients
  - Messages typés pour différents événements
  - Broadcast aux clients connectés

- **Événements** :
  - Mise à jour de l'arborescence
  - Changement de state
  - Modification de configuration
  - Upload de plan

## 3. Exigences Techniques

### 3.1. Architecture
- **Backend** : Node.js avec Express
- **Langage** : TypeScript
- **Communication** : REST + WebSocket
- **Persistance** : Cache mémoire + fichiers de configuration

### 3.2. Performances
- **Cache mémoire** pour l'arborescence et les states
- **TTL configurable** (5 minutes par défaut)
- **Rafraîchissement** :
  - Complet au démarrage et sur demande
  - Incrémental via événements WebSocket

### 3.3. Sécurité
- **Répertoire `config/`** exclu de Git
- **Masquage des clés** dans les logs
- **Validation des configurations**
- **Permissions restrictives** sur les fichiers

## 4. Contraintes

### 4.1. Limitations
- Cache mémoire non persistant entre redémarrages
- Pas de haute disponibilité dans cette version
- Scalabilité limitée par la mémoire disponible

### 4.2. Compatibilité
- Home Assistant version 2023.0 ou supérieure
- Node.js 16+
- Navigateurs modernes pour le client

## 5. Livrables

### 5.1. Serveur
- Code source TypeScript
- Documentation technique
- Scripts de build et exécution
- Fichiers de configuration d'exemple

### 5.2. Documentation
- Guide d'installation
- Documentation de l'API
- Exemples d'utilisation
- Guide de développement

## 6. Critères d'Acceptation

### 6.1. Fonctionnels
- [ ] Connexion réussie à Home Assistant
- [ ] Récupération correcte de l'arborescence
- [ ] Mises à jour des states en temps réel
- [ ] Persistance de la configuration client
- [ ] Upload et diffusion des plans

### 6.2. Techniques
- [ ] Cache mémoire fonctionnel
- [ ] Performances acceptables (< 500ms pour les requêtes)
- [ ] Sécurité des données sensibles
- [ ] Journalisation appropriée

### 6.3. Documentation
- [ ] Documentation complète
- [ ] Exemples fonctionnels
- [ ] Guide de déploiement