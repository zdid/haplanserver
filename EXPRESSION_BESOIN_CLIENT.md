# Expression des Besoins - Application Client Home Assistant

## 1. Contexte

Développement d'une application web cliente en TypeScript pour interagir avec le backend testvibe5 et afficher un plan interactif avec des objets connectés à Home Assistant.

### 1.1 Objectifs Principaux
- Afficher un plan d'étage avec des objets représentant des entités Home Assistant
- Permettre l'interaction avec ces objets (contrôle des lumières, thermostats, etc.)
- Fournir une interface de paramétrage pour positionner les objets
- Assurer la synchronisation en temps réel avec Home Assistant via le backend

### 1.2 Public Cible
- Utilisateurs finaux de Home Assistant
- Installateurs et intégrateurs de systèmes domotiques
- Administrateurs souhaitant visualiser et contrôler leur installation

## 2. Fonctionnalités Requises

### 2.1 Affichage du Plan

**Exigences :**
- Afficher un plan d'étage dans une boîte conteneur redimensionnable
- Conserver le ratio hauteur/largeur du plan original
- Redimensionner automatiquement le plan pour qu'il tienne entièrement dans la boîte
- Gérer les plans de différentes tailles et résolutions

**Contraintes :**
- Le plan doit toujours être visible en entier
- Les objets doivent rester proportionnels au plan, pas à la boîte conteneur
- Performance de rendu optimisée pour les grands plans

### 2.2 Gestion des Objets

**Types d'objets :**
1. **Capteurs standards** : Affichage texte avec unité de mesure
2. **Lumière simple** : Icône lampe avec toggle on/off
3. **Lumière avec brightness** : Icône lampe + boutons +/- 
4. **Volet roulant** : Pourcentage + flèches haut/bas + stop
5. **Store** : Pourcentage + flèches gauche/droite + stop
6. **Thermostat** : Température + boutons +/- avec délai

**Exigences :**
- Positionnement relatif au plan (coordonnées 0-1)
- Centrage des objets sur leur position (x,y)
- Mise à jour dynamique des états via WebSocket
- Actions immédiates ou différées selon le type d'objet

### 2.3 Mode Paramétrage

**Exigences :**
- Activation/désactivation explicite par l'utilisateur
- **Uniquement disponible en mode paramétrage :**
  - Ajout de nouvelles entités
  - Déplacement des objets (drag-and-drop)
  - Suppression des objets (glissement vers poubelle)
  - Upload de plan

**Contraintes :**
- Le drag-and-drop doit être contraint à la surface du plan
- La poubelle doit être positionnée en bas à gauche du plan
- Sauvegarde automatique après 5s d'inactivité

### 2.4 Gestion du Mode Initial

**Règles :**
- Si aucun plan n'est disponible à la première réception des données → **mode paramétrage par défaut**
- Si un plan est disponible → **mode normal par défaut**
- Impossible de quitter le mode paramétrage sans avoir téléversé un plan

### 2.5 Upload de Plan

**Exigences :**
- Uniquement accessible en mode paramétrage
- Affichage d'un indicateur de progression
- Rafraîchissement automatique 2s après upload réussi
- Gestion des erreurs avec feedback utilisateur

### 2.6 Menu Principal

**Options :**
1. **Choix d'entité** (uniquement en mode paramétrage)
   - Sélection via arborescence (Area → Device → Entity)
   - Affichage au centre du plan
   - Filtre des entités déjà placées
   - Exclusion des entités de diagnostic/config

2. **Rafraîchissement**
   - Demande de refresh complet au serveur
   - Indicateur de chargement pendant l'opération

3. **Upload de plan** (uniquement en mode paramétrage)
   - Interface de sélection de fichier
   - Validation du format d'image

4. **Mode paramétrage**
   - Toggle entre mode normal et paramétrage
   - Confirmation avant sortie si modifications non sauvegardées

### 2.7 Synchronisation des Données

**Exigences :**
- Connexion WebSocket persistante au backend
- Mise à jour en temps réel des states
- Sauvegarde des positions des objets
- Restauration des positions après rafraîchissement

## 3. Exigences Techniques

### 3.1 Architecture
- **Langage** : TypeScript
- **Bundling** : Production d'un seul fichier JS
- **Communication** : WebSocket + API REST
- **Responsive** : Adaptation à différentes tailles d'écran

### 3.2 Performances
- Temps de rendu < 500ms pour 50 objets
- Mise à jour des states < 100ms
- Gestion mémoire optimisée pour les grands plans

### 3.3 Sécurité
- Validation des données reçues
- Gestion des erreurs de connexion
- Protection contre les actions non autorisées

### 3.4 Compatibilité
- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Mobile et desktop
- Écrans tactiles et souris

## 4. Contraintes

### 4.1 Limitations
- Un seul plan à la fois
- Maximum 100 objets affichables simultanément
- Taille maximale du plan : 5000x5000px

### 4.2 Dépendances
- Backend testvibe5 opérationnel
- Connexion à Home Assistant fonctionnelle
- Navigateur avec support WebSocket

## 5. Critères d'Acceptation

### 5.1 Fonctionnels
- [ ] Affichage correct du plan avec conservation du ratio
- [ ] Positionnement précis des objets selon coordonnées relatives
- [ ] Interaction fonctionnelle avec tous les types d'objets
- [ ] Mode paramétrage accessible et fonctionnel
- [ ] Upload de plan avec rafraîchissement automatique
- [ ] Synchronisation en temps réel des states

### 5.2 Techniques
- [ ] Bundle unique < 500KB
- [ ] Temps de chargement < 2s
- [ ] Pas de fuites mémoire détectables
- [ ] Compatibilité multi-navigateurs

### 5.3 Expérience Utilisateur
- [ ] Interface intuitive et responsive
- [ ] Feedback visuel pour toutes les actions
- [ ] Gestion claire des erreurs
- [ ] Performances fluides

## 6. Livrables

### 6.1 Code Source
- Fichiers TypeScript organisés en modules
- Documentation du code
- Tests unitaires

### 6.2 Build de Production
- Fichier JS unique minifié
- Assets optimisés
- Configuration de build

### 6.3 Documentation
- Guide d'intégration
- Documentation de l'API client
- Exemples d'utilisation

## 7. Planification

### 7.1 Phases de Développement
1. Infrastructure de base (2 jours)
2. Affichage du plan et objets (3 jours)
3. Mode paramétrage (2 jours)
4. Synchronisation et tests (2 jours)

### 7.2 Livraison
- Version bêta : 1 semaine
- Version stable : 2 semaines
- Documentation finale : 3 jours

## 8. Glossaire

- **HA** : Home Assistant
- **WebSocket** : Protocole de communication temps réel
- **API REST** : Interface de programmation pour échanges HTTP
- **Drag-and-drop** : Technique d'interface pour déplacer des éléments
- **Ratio** : Rapport hauteur/largeur
- **State** : État d'une entité Home Assistant
