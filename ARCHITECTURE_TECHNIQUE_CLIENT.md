# Architecture Technique - Application Client Home Assistant

## Table des Matières
1. [Aperçu Global](#1-aperçu-global)
2. [Architecture en Couches](#2-architecture-en-couches)
3. [Composants Principaux](#3-composants-principaux)
4. [Flux de Données](#4-flux-de-données)
5. [Gestion des États](#5-gestion-des-états)
6. [Système de Coordonnées](#6-système-de-coordonnées)
7. [Communication avec le Backend](#7-communication-avec-le-backend)
8. [Gestion du Mode Paramétrage](#8-gestion-du-mode-paramétrage)
9. [Rendu Graphique](#9-rendu-graphique)
10. [Structure des Fichiers](#10-structure-des-fichiers)
11. [Technologies Utilisées](#11-technologies-utilisées)
12. [Performances et Optimisations](#12-performances-et-optimisations)
13. [Gestion des Erreurs](#13-gestion-des-erreurs)
14. [Sécurité](#14-sécurité)
15. [Build et Déploiement](#15-build-et-déploiement)

## 1. Aperçu Global

### 1.1 Description

Application web cliente en TypeScript pour visualiser et interagir avec des entités Home Assistant sur un plan d'étage interactif. L'application communique avec le backend testvibe5 via WebSocket et API REST.

### 1.2 Objectifs Techniques

- **Modularité** : Architecture découpée en composants indépendants
- **Maintenabilité** : Code bien structuré et documenté
- **Performances** : Rendu optimisé pour les plans complexes
- **Extensibilité** : Facilité d'ajout de nouveaux types d'objets
- **Responsive** : Adaptation à différentes tailles d'écran

### 1.3 Principes de Conception

1. **Séparation des préoccupations** : Chaque composant a une responsabilité unique
2. **Inversion de dépendances** : Les composants de haut niveau dépendent d'abstractions
3. **Réactivité** : Mise à jour automatique de l'interface en fonction des données
4. **Immuabilité** : Les données ne sont jamais modifiées directement
5. **Testabilité** : Conception orientée vers la facilité de test

## 2. Architecture en Couches

```
┌─────────────────────────────────────────────────┐
│                 Couche Présentation              │
│  ┌───────────────────────────────────────────┐  │
│  │               Composants UI               │  │
│  │  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Floorplan   │  │ Object Renderers   ││  │
│  │  └─────────────┘  └─────────────────────┘│  │
│  │  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Menu System │  │ Drag-and-Drop      ││  │
│  │  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 Couche Métier                   │
│  ┌───────────────────────────────────────────┐  │
│  │               Services                     │  │
│  │  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ State       │  │ Position           ││  │
│  │  │ Manager     │  │ Manager            ││  │
│  │  └─────────────┘  └─────────────────────┘│  │
│  │  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Config      │  │ Mode               ││  │
│  │  │ Manager     │  │ Manager            ││  │
│  │  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 Couche Données                  │
│  ┌───────────────────────────────────────────┐  │
│  │               Connexion                   │  │
│  │  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ WebSocket   │  │ API Service         ││  │
│  │  │ Service     │  │                     ││  │
│  │  └─────────────┘  └─────────────────────┘│  │
│  │  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Cache       │  │ Local Storage      ││  │
│  │  │ Manager     │  │ Manager            ││  │
│  │  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 3. Composants Principaux

### 3.1 FloorplanController (Contrôleur Principal)

**Responsabilités :**
- Coordination globale de l'application
- Gestion du cycle de vie
- Routage des événements entre composants

**Méthodes clés :**
- `initialize()` : Initialisation de l'application
- `enterParametrageMode()` : Activation du mode paramétrage
- `exitParametrageMode()` : Désactivation du mode paramétrage
- `handleDataUpdate()` : Traitement des mises à jour de données

### 3.2 FloorplanRenderer (Rendu du Plan)

**Responsabilités :**
- Affichage du plan d'étage
- Gestion du redimensionnement
- Conservation du ratio hauteur/largeur

**Propriétés :**
- `planElement` : Référence DOM du plan
- `container` : Référence DOM du conteneur
- `currentRatio` : Ratio actuel du plan

**Méthodes :**
- `renderPlan(imagePath: string)` : Affichage du plan
- `resizeToFitContainer()` : Ajustement automatique
- `calculateOptimalSize()` : Calcul de la taille optimale

### 3.3 ObjectRenderer (Rendu des Objets)

**Responsabilités :**
- Création et mise à jour des objets
- Positionnement relatif au plan
- Gestion des interactions utilisateur

**Classes dérivées :**
- `SensorRenderer` : Capteurs standards
- `LightRenderer` : Lumière simple et avec brightness
- `CoverRenderer` : Volets et stores
- `ThermostatRenderer` : Thermostat

### 3.4 DragAndDropManager (Gestion du Drag-and-Drop)

**Responsabilités :**
- Gestion des événements de drag
- Contraintes de déplacement
- Détection de la zone de poubelle

**Méthodes :**
- `startDrag(entity_id: string, clientX: number, clientY: number)`
- `drag(clientX: number, clientY: number)`
- `endDrag(clientX: number, clientY: number)`
- `checkTrashDrop(clientX: number, clientY: number)`

### 3.5 ModeManager (Gestion des Modes)

**Responsabilités :**
- Gestion du mode courant (normal/paramétrage)
- Application des restrictions d'accès
- Transition entre modes

**Propriétés :**
- `currentMode` : Mode actuel
- `canAddEntities` : Autorisation d'ajout
- `canMoveEntities` : Autorisation de déplacement

### 3.6 WebSocketService (Communication WebSocket)

**Responsabilités :**
- Connexion et maintien de la connexion WebSocket
- Gestion des messages entrants
- Réémission des messages

**Événements gérés :**
- `update:tree` : Mise à jour de l'arborescence
- `update:state` : Mise à jour d'un state
- `update:config` : Mise à jour de configuration
- `update:floorplan` : Mise à jour du plan

### 3.7 APIService (Appels API REST)

**Endpoints utilisés :**
- `GET /api/data` : Données initiales
- `GET /api/refresh` : Rafraîchissement
- `POST /api/floorplan/upload` : Upload de plan
- `POST /api/config/save` : Sauvegarde de configuration

## 4. Flux de Données

### 4.1 Flux Initial

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Client    │       │    Backend      │       │  Home Assistant │
└─────────────┘       └─────────────────┘       └─────────────────┘
       │                       │                         │
       │  1. Connexion WebSocket│                         │
       │──────────────────────►│                         │
       │                       │                         │
       │  2. Requête données   │                         │
       │──────────────────────►│                         │
       │                       │                         │
       │  3. Reçoit données    │                         │
       │◄──────────────────────│                         │
       │    initiales          │                         │
       │                       │                         │
       │  4. Vérifie plan      │                         │
       │◄──────────────────────│                         │
       │                       │                         │
       │  5. Mode initial      │                         │
       │  (paramétrage si      │                         │
       │   pas de plan)        │                         │
       │                       │                         │
       │  6. Affiche interface │                         │
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
       │                       │  2. Broadcast WebSocket │
       │                       │────────────────────────►│
       │                       │                         │
       │                       │  3. Mise à jour state   │
       │                       │◄────────────────────────│
       │                       │                         │
       │                       │  4. Mise à jour objet   │
       │                       │◄────────────────────────│
       │                       │                         │
```

### 4.3 Flux d'Action Utilisateur

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Client    │       │    Backend      │       │  Home Assistant │
└─────────────┘       └─────────────────┘       └─────────────────┘
       │                       │                         │
       │  1. Action            │                         │
       │──────────────────────►│                         │
       │  (toggle lumière)     │                         │
       │                       │                         │
       │                       │  2. Appel API           │
       │                       │────────────────────────►│
       │                       │                         │
       │                       │  3. Exécution commande │
       │                       │◄────────────────────────│
       │                       │                         │
       │                       │  4. Confirmation       │
       │◄──────────────────────│                         │
       │                       │                         │
       │  5. Mise à jour UI    │                         │
       │◄──────────────────────│                         │
       │                       │                         │
```

## 5. Gestion des États

### 5.1 Structure des États

```typescript
interface AppState {
  mode: 'normal' | 'parametrage';
  hasFloorplan: boolean;
  isFirstUpload: boolean;
  floorplan: {
    path?: string;
    dimensions?: { width: number; height: number };
    lastUploaded?: number;
  };
  objects: FloorplanObject[];
  availableEntities: HAEntity[];
  lastRefresh: number;
  isSaving: boolean;
  lastSaveTime: number;
}
```

### 5.2 StateManager

**Responsabilités :**
- Maintien de l'état global
- Application des mises à jour
- Notification des changements

**Méthodes :**
- `updateState(partialState: Partial<AppState>)` : Mise à jour partielle
- `getState()` : Récupération de l'état courant
- `subscribe(listener: (state: AppState) => void)` : Abonnement aux changements
- `saveState()` : Sauvegarde de l'état

## 6. Système de Coordonnées

### 6.1 Principe

Les positions des objets sont définies en **coordonnées relatives au plan** (0-1) et non à la boîte conteneur.

```
Plan (800x600) dans Conteneur (1000x700)
┌─────────────────────────────────────┐
│                                 │   │
│  ┌─────────────────────────────┐  │   │
│  │                             │  │   │
│  │  Objet à (0.5, 0.25)       │  │   │
│  │  → Position absolue:       │  │   │
│  │  (400, 150)                │  │   │
│  │                             │  │   │
│  └─────────────────────────────┘  │   │
│                                 │   │
└─────────────────────────────────────┘
```

### 6.2 PositionCalculator

**Méthodes :**
```typescript
class PositionCalculator {
  // Convertit les coordonnées relatives en absolues
  static toAbsolute(
    relative: {x: number, y: number},
    planSize: {width: number, height: number}
  ): {x: number, y: number} {
    return {
      x: relative.x * planSize.width,
      y: relative.y * planSize.height
    };
  }

  // Convertit les coordonnées absolues en relatives
  static toRelative(
    absolute: {x: number, y: number},
    planSize: {width: number, height: number}
  ): {x: number, y: number} {
    return {
      x: absolute.x / planSize.width,
      y: absolute.y / planSize.height
    };
  }

  // Contraint les coordonnées dans [0, 1]
  static constrain(
    position: {x: number, y: number}
  ): {x: number, y: number} {
    return {
      x: Math.max(0, Math.min(1, position.x)),
      y: Math.max(0, Math.min(1, position.y))
    };
  }
}
```

## 7. Communication avec le Backend

### 7.1 WebSocketService

**Implémentation :**
```typescript
class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;

  connect(url: string): void {
    this.socket = new WebSocket(url);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.notify('connected');
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.socket.onclose = () => {
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      this.handleError(error);
    };
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.dispatchMessage(message);
    } catch (error) {
      this.handleError(error);
    }
  }

  private dispatchMessage(message: any): void {
    switch (message.type) {
      case 'update:tree':
        this.handleTreeUpdate(message.data);
        break;
      case 'update:state':
        this.handleStateUpdate(message.data);
        break;
      case 'update:config':
        this.handleConfigUpdate(message.data);
        break;
      case 'update:floorplan':
        this.handleFloorplanUpdate(message.data);
        break;
    }
  }

  sendMessage(type: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }
}
```

### 7.2 APIService

**Implémentation :**
```typescript
class APIService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getInitialData(): Promise<InitialData> {
    const response = await fetch(`${this.baseUrl}/api/data`);
    return response.json();
  }

  async refreshData(): Promise<RefreshResponse> {
    const response = await fetch(`${this.baseUrl}/api/refresh`);
    return response.json();
  }

  async uploadFloorplan(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('floorplan', file);

    const response = await fetch(`${this.baseUrl}/api/floorplan/upload`, {
      method: 'POST',
      body: formData
    });

    return response.json();
  }

  async saveConfig(config: FloorplanConfig): Promise<SaveResponse> {
    const response = await fetch(`${this.baseUrl}/api/config/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    return response.json();
  }

  async sendCommand(command: HACommand): Promise<CommandResponse> {
    const response = await fetch(`${this.baseUrl}/api/entities/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    });

    return response.json();
  }
}
```

## 8. Gestion du Mode Paramétrage

### 8.1 ModeManager

**Implémentation :**
```typescript
class ModeManager {
  private currentMode: 'normal' | 'parametrage' = 'normal';
  private hasFloorplan: boolean = false;
  private listeners: ((mode: 'normal' | 'parametrage') => void)[] = [];

  constructor(hasFloorplan: boolean) {
    this.hasFloorplan = hasFloorplan;
    this.determineInitialMode();
  }

  private determineInitialMode(): void {
    // Mode paramétrage par défaut si pas de plan
    this.currentMode = this.hasFloorplan ? 'normal' : 'parametrage';
    this.notifyListeners();
  }

  enterParametrageMode(): void {
    this.currentMode = 'parametrage';
    this.notifyListeners();
  }

  exitParametrageMode(): void {
    if (!this.hasFloorplan) {
      throw new Error('Cannot exit parametrage mode without floorplan');
    }
    this.currentMode = 'normal';
    this.notifyListeners();
  }

  canAddEntities(): boolean {
    return this.currentMode === 'parametrage';
  }

  canMoveEntities(): boolean {
    return this.currentMode === 'parametrage';
  }

  canDeleteEntities(): boolean {
    return this.currentMode === 'parametrage';
  }

  canUploadFloorplan(): boolean {
    return this.currentMode === 'parametrage';
  }

  onFloorplanUploaded(): void {
    this.hasFloorplan = true;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentMode));
  }

  subscribe(listener: (mode: 'normal' | 'parametrage') => void): void {
    this.listeners.push(listener);
  }
}
```

### 8.2 Intégration avec l'Interface

```typescript
class UIModeController {
  constructor(private modeManager: ModeManager) {
    modeManager.subscribe(this.updateUI.bind(this));
    this.updateUI(modeManager.currentMode);
  }

  private updateUI(mode: 'normal' | 'parametrage'): void {
    // Mise à jour des boutons
    document.getElementById('upload-btn')!.style.display =
      mode === 'parametrage' ? 'block' : 'none';

    document.getElementById('entity-selector')!.style.display =
      mode === 'parametrage' ? 'block' : 'none';

    document.getElementById('trash-icon')!.style.display =
      mode === 'parametrage' ? 'block' : 'none';

    // Mise à jour des indicateurs
    const modeIndicator = document.getElementById('mode-indicator')!;
    modeIndicator.textContent = mode === 'parametrage'
      ? 'Mode Paramétrage'
      : 'Mode Normal';
    modeIndicator.className = mode;
  }
}
```

## 9. Rendu Graphique

### 9.1 FloorplanRenderer

**Implémentation :**
```typescript
class FloorplanRenderer {
  private container: HTMLElement;
  private planElement: HTMLImageElement;
  private objectContainer: HTMLElement;
  private currentRatio: number = 1;

  constructor(container: HTMLElement) {
    this.container = container;
    this.planElement = document.createElement('img');
    this.objectContainer = document.createElement('div');
    this.objectContainer.className = 'object-container';

    this.container.appendChild(this.planElement);
    this.container.appendChild(this.objectContainer);

    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    const observer = new ResizeObserver(entries => {
      this.resizeToFitContainer();
    });
    observer.observe(this.container);
  }

  renderPlan(imagePath: string): void {
    this.planElement.src = imagePath;
    this.planElement.onload = () => {
      this.resizeToFitContainer();
    };
  }

  private resizeToFitContainer(): void {
    const containerRect = this.container.getBoundingClientRect();
    const planRect = this.planElement.getBoundingClientRect();

    if (planRect.width === 0 || planRect.height === 0) return;

    // Calcul du ratio
    const planRatio = planRect.width / planRect.height;
    const containerRatio = containerRect.width / containerRect.height;

    let width, height;

    if (planRatio > containerRatio) {
      // Plan plus large que le conteneur
      width = containerRect.width;
      height = width / planRatio;
    } else {
      // Plan plus haut que le conteneur
      height = containerRect.height;
      width = height * planRatio;
    }

    // Application des dimensions
    this.planElement.style.width = `${width}px`;
    this.planElement.style.height = `${height}px`;
    this.objectContainer.style.width = `${width}px`;
    this.objectContainer.style.height = `${height}px`;

    this.currentRatio = planRatio;

    // Repositionnement des objets
    this.updateAllObjectPositions();
  }

  addObject(object: FloorplanObject): void {
    const element = this.createObjectElement(object);
    this.objectContainer.appendChild(element);
    this.positionObject(element, object.position);
  }

  private createObjectElement(object: FloorplanObject): HTMLElement {
    const element = document.createElement('div');
    element.className = `ha-object ${object.type}`;
    element.id = `obj-${object.entity_id}`;
    element.dataset.entity_id = object.entity_id;
    return element;
  }

  private positionObject(element: HTMLElement, position: {x: number, y: number}): void {
    const planRect = this.planElement.getBoundingClientRect();
    const absolutePos = PositionCalculator.toAbsolute(position, planRect);

    // Centrage de l'objet
    element.style.transform = `
      translate(
        ${absolutePos.x - element.offsetWidth / 2}px,
        ${absolutePos.y - element.offsetHeight / 2}px
      )
    `;
  }

  private updateAllObjectPositions(): void {
    const objects = Array.from(this.objectContainer.children) as HTMLElement[];
    objects.forEach(element => {
      const entity_id = element.dataset.entity_id!;
      const object = this.getObjectById(entity_id);
      if (object) {
        this.positionObject(element, object.position);
      }
    });
  }
}
```

### 9.2 Object Renderers

**Base Object Renderer :**
```typescript
abstract class BaseObjectRenderer {
  protected element: HTMLElement;

  constructor(protected object: FloorplanObject) {
    this.element = document.createElement('div');
    this.element.className = `ha-object ${object.type}`;
    this.element.id = `obj-${object.entity_id}`;
  }

  abstract render(): HTMLElement;
  abstract updateState(state: HAState): void;

  protected createIcon(name: string): HTMLElement {
    const icon = document.createElement('i');
    icon.className = `ha-icon ${name}`;
    return icon;
  }
}

class LightRenderer extends BaseObjectRenderer {
  render(): HTMLElement {
    this.element.innerHTML = '';

    const icon = this.createIcon('lightbulb');
    this.element.appendChild(icon);

    if (this.object.type === 'light-brightness') {
      const minusBtn = this.createIcon('minus');
      minusBtn.addEventListener('click', () => this.decreaseBrightness());

      const plusBtn = this.createIcon('plus');
      plusBtn.addEventListener('click', () => this.increaseBrightness());

      this.element.appendChild(minusBtn);
      this.element.appendChild(plusBtn);
    }

    this.element.addEventListener('click', () => this.toggleLight());

    return this.element;
  }

  updateState(state: HAState): void {
    this.element.classList.toggle('on', state.state === 'on');
    this.element.classList.toggle('off', state.state === 'off');
  }

  private toggleLight(): void {
    // Logique de toggle
  }

  private decreaseBrightness(): void {
    // Logique de diminution
  }

  private increaseBrightness(): void {
    // Logique d'augmentation
  }
}
```

## 10. Structure des Fichiers

```
client/
├── src/
│   ├── core/
│   │   ├── controllers/
│   │   │   ├── floorplan-controller.ts
│   │   │   ├── mode-manager.ts
│   │   │   └── state-manager.ts
│   │   ├── services/
│   │   │   ├── api-service.ts
│   │   │   ├── websocket-service.ts
│   │   │   └── position-calculator.ts
│   │   └── types/
│   │       ├── ha-types.ts
│   │       └── client-types.ts
│   ├── components/
│   │   ├── floorplan/
│   │   │   ├── floorplan-renderer.ts
│   │   │   ├── drag-manager.ts
│   │   │   └── object-renderer.ts
│   │   ├── objects/
│   │   │   ├── base-object.ts
│   │   │   ├── sensor-object.ts
│   │   │   ├── light-object.ts
│   │   │   ├── cover-object.ts
│   │   │   └── thermostat-object.ts
│   │   └── ui/
│   │       ├── menu-system.ts
│   │       ├── upload-manager.ts
│   │       └── notification-system.ts
│   ├── utils/
│   │   ├── dom-utils.ts
│   │   ├── logger.ts
│   │   └── storage-manager.ts
│   └── index.ts
├── assets/
│   ├── icons/
│   │   └── *.svg
│   └── styles/
│       └── main.css
├── package.json
├── tsconfig.json
├── webpack.config.js
└── index.html
```

## 11. Technologies Utilisées

| Catégorie | Technologie | Version | Description |
|-----------|-------------|---------|-------------|
| Langage | TypeScript | 5.x | JavaScript typé |
| Bundler | Webpack | 5.x | Bundling et optimisation |
| Communication | WebSocket | Native | Communication temps réel |
| HTTP | Fetch API | Native | Appels API REST |
| DOM | Native | - | Manipulation du DOM |
| Styles | CSS | 3 | Styles et animations |
| Icônes | SVG | - | Icônes vectorielles |
| Tests | Jest | 29.x | Tests unitaires |
| Linting | ESLint | 8.x | Qualité de code |
| Format | Prettier | 3.x | Formatage de code |

## 12. Performances et Optimisations

### 12.1 Optimisations de Rendu

1. **Virtual DOM** : Utilisation de document fragments pour les mises à jour
2. **Debouncing** : Regroupement des mises à jour de position
3. **CSS Transforms** : Utilisation de transform pour le positionnement
4. **RequestAnimationFrame** : Synchronisation avec le rafraîchissement d'écran
5. **Object Pooling** : Réutilisation des éléments DOM

### 12.2 Gestion Mémoire

1. **Garbage Collection** : Nettoyage des références inutiles
2. **Weak References** : Pour les caches temporaires
3. **Event Listeners** : Nettoyage des listeners lors de la destruction
4. **Image Loading** : Libération des ressources images

### 12.3 Optimisations Réseau

1. **Compression** : Minification du code et des assets
2. **Caching** : Cache des ressources statiques
3. **Batching** : Regroupement des mises à jour WebSocket
4. **Reconnexion** : Stratégie de reconnexion intelligente

## 13. Gestion des Erreurs

### 13.1 Stratégie

1. **Détection** : Identification rapide des erreurs
2. **Isolation** : Empêcher la propagation
3. **Notification** : Feedback utilisateur clair
4. **Récupération** : Retour à un état stable

### 13.2 Types d'Erreurs

1. **Connexion** : Échec de connexion au backend
2. **Données** : Format de données invalide
3. **Rendu** : Échec de rendu d'un objet
4. **Action** : Échec d'exécution d'une commande

### 13.3 Implémentation

```typescript
class ErrorHandler {
  private static instance: ErrorHandler;
  private listeners: ((error: Error) => void)[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: Error): void {
    console.error('Error:', error);
    this.notifyListeners(error);
    this.showUserNotification(error);
  }

  private showUserNotification(error: Error): void {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = this.getUserFriendlyMessage(error);
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  private getUserFriendlyMessage(error: Error): string {
    if (error.message.includes('connection')) {
      return 'Problème de connexion au serveur';
    }
    if (error.message.includes('timeout')) {
      return 'Délai de réponse dépassé';
    }
    return 'Une erreur est survenue';
  }

  subscribe(listener: (error: Error) => void): void {
    this.listeners.push(listener);
  }
}
```

## 14. Sécurité

### 14.1 Mesures de Sécurité

1. **Validation des données** : Vérification de tous les inputs
2. **Sanitization** : Nettoyage des données avant affichage
3. **CORS** : Respect des politiques CORS
4. **HTTPS** : Communication sécurisée
5. **Storage** : Chiffrement des données sensibles

### 14.2 Bonnes Pratiques

1. **Ne pas faire confiance au client** : Toutes les validations sont aussi côté serveur
2. **Gestion des erreurs sécurisée** : Pas de fuite d'informations
3. **Mises à jour** : Maintenance régulière des dépendances
4. **Audit** : Revue de code régulière

## 15. Build et Déploiement

### 15.1 Configuration Webpack

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/,
        use: ['svg-inline-loader'],
      },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000,
  },
  optimization: {
    minimize: true,
  },
};
```

### 15.2 Scripts de Build

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack serve --mode development",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

### 15.3 Déploiement

1. **Build** : `npm run build`
2. **Test** : Vérification du bundle généré
3. **Déploiement** : Copie des fichiers sur le serveur
4. **Validation** : Tests en environnement de production

## Conclusion

Cette architecture technique fournit une base solide pour le développement de l'application client Home Assistant. Elle combine :

- Une **architecture modulaire** pour la maintenabilité
- Un **système de coordonnées robuste** pour le positionnement
- Une **gestion d'état claire** pour la réactivité
- Des **optimisations de performance** pour la fluidité
- Une **stratégie de gestion des erreurs** pour la robustesse

L'implémentation suit les meilleures pratiques du développement web moderne tout en répondant spécifiquement aux exigences du projet.
