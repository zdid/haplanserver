# Documentation de la Propagation des States

## Introduction

Ce document décrit le mécanisme de propagation des mises à jour de state depuis Home Assistant vers les clients connectés via WebSocket. Le système assure que chaque changement d'état d'une entité est immédiatement communiqué à tous les clients connectés.

## Architecture

### Flux de Propagation

```
Home Assistant → StateCache → NotificationService → Clients WebSocket
```

### Composants Impliqués

1. **StateCache** (`src/core/cache/state-cache.ts`)
   - Écoute les événements `state_changed` de Home Assistant
   - Met à jour le cache local des states
   - Notifie le NotificationService des changements

2. **NotificationService** (`src/services/notification-service.ts`)
   - Gère la liste des clients WebSocket connectés
   - Envoie les notifications aux clients
   - Gère les statistiques d'envoi

3. **Clients WebSocket**
   - Reçoivent les notifications en temps réel
   - Met à jour leur interface utilisateur

## Flux Détaillé

### 1. Détection du Changement

- Home Assistant émet un événement `state_changed`
- StateCache écoute ces événements via `connection.subscribeEvents()`
- Une trace est créée pour suivre le traitement

### 2. Traitement du Changement

```typescript
this.connection.subscribeEvents((event: any) => {
  if (event.event_type === "state_changed") {
    // Créer une trace
    const traceContext = Tracer.startTrace('StateCache.stateChanged', {
      entity_id: event.data.new_state.entity_id,
      old_state: event.data.old_state?.state,
      new_state: event.data.new_state.state
    });
    
    // Mettre à jour le cache
    this.updateState(event.data.new_state, traceContext);
    
    // Notifier les clients
    if (this.notificationService) {
      this.notificationService.broadcastUpdate('state', {...}, traceContext);
    }
    
    // Terminer la trace
    Tracer.endTrace(traceContext, 'SUCCESS', {...});
  }
}, "state_changed");
```

### 3. Notification des Clients

```typescript
broadcastUpdate(type: string, data: any, traceContext?: TraceContext): void {
  // Créer un message
  const message = JSON.stringify({
    type: `update:${type}`,
    timestamp: Date.now(),
    data: data
  });
  
  // Envoyer à tous les clients
  this.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}
```

### 4. Réception par le Client

```javascript
// Client WebSocket
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'update:state') {
    // Mettre à jour l'interface utilisateur
    updateEntityState(message.data.entity_id, message.data);
  }
};
```

## Format des Messages

### Message de Notification

```json
{
  "type": "update:state",
  "timestamp": 1234567890123,
  "data": {
    "entity_id": "light.living_room",
    "state": "on",
    "attributes": {
      "brightness": 255,
      "friendly_name": "Living Room Light"
    },
    "last_changed": "2024-01-23T10:05:00.000Z",
    "last_updated": "2024-01-23T10:05:00.000Z"
  }
}
```

### Champs du Message

- **type** : Type de mise à jour (`update:state`)
- **timestamp** : Horodatage de la notification
- **data.entity_id** : Identifiant de l'entité
- **data.state** : Nouveau state de l'entité
- **data.attributes** : Attributs de l'entité
- **data.last_changed** : Dernier changement
- **data.last_updated** : Dernière mise à jour

## Traçage et Journalisation

### Traces Générées

1. **StateCache.stateChanged** : Détection du changement
2. **StateCache.notifyClients** : Notification des clients
3. **NotificationService.broadcastUpdate** : Diffusion de la notification

### Exemple de Traces

```
[TRACE] [START] {"traceId": "abc-123", "operation": "StateCache.stateChanged", "metadata": {"entity_id": "light.living_room", "old_state": "off", "new_state": "on"}}
[TRACE] [abc-123] StateCache: Changement de state détecté pour light.living_room
[TRACE] [abc-123] Ancien state: off → Nouveau state: on
[TRACE] [CONTINUE] {"traceId": "def-456", "parentId": "abc-123", "operation": "StateCache.notifyClients"}
[TRACE] [def-456] StateCache: Notification des clients du changement de state
[TRACE] [CONTINUE] {"traceId": "ghi-789", "parentId": "def-456", "operation": "NotificationService.broadcastUpdate"}
[TRACE] [ghi-789] NotificationService: Broadcast de state à 3 clients
[TRACE] [ghi-789] Notification propagée: 3/3 clients
[TRACE] [def-456] StateCache: Notification envoyée aux clients
[TRACE] [abc-123] StateCache: Changement de state traité avec succès
```

## Gestion des Erreurs

### Scénarios d'Erreur

1. **NotificationService non disponible**
   - Un avertissement est journalisé
   - Le state est mis à jour mais les clients ne sont pas notifiés

2. **Client non prêt**
   - Les clients avec `readyState !== 1` sont ignorés
   - Une statistique est maintenue

3. **Échec d'envoi**
   - Les erreurs d'envoi sont capturées
   - Le traitement continue pour les autres clients

### Journalisation des Erreurs

```
[TRACE] [abc-123] StateCache: Avertissement - NotificationService non disponible
[TRACE] [def-456] Échec de l'envoi au client: Error: Connection closed
[TRACE] [def-456] Client non prêt (readyState: 3)
```

## Statistiques de Propagation

Chaque notification génère des statistiques :

- **successfullySent** : Nombre de clients ayant reçu la notification
- **failedToSend** : Nombre d'échecs d'envoi
- **totalClients** : Nombre total de clients connectés

## Configuration

### Activation

La propagation est activée automatiquement lorsque :

1. Le NotificationService est injecté dans le HADataService
2. Le HADataService est initialisé
3. Le StateCache démarre l'écoute des événements

### Code d'Initialisation

```typescript
// Dans src/index.ts
const notificationService = new NotificationService();
const haDataService = new HADataService(connection);
haDataService.setNotificationService(notificationService);
await haDataService.initialize();
```

## Performances

### Optimisations

- **Asynchrone** : Le traitement ne bloque pas le thread principal
- **Efficace** : Seuls les clients connectés reçoivent les notifications
- **Léger** : Les messages sont au format JSON compact

### Métriques

- **Latence** : < 100ms entre le changement et la notification
- **Débit** : Peut gérer des centaines de mises à jour par seconde
- **Évolutivité** : Gère automatiquement l'ajout/suppression de clients

## Tests

### Test Manuel

1. Connecter un client WebSocket
2. Changer l'état d'une entité dans Home Assistant
3. Vérifier que le client reçoit la notification
4. Vérifier les logs pour confirmer la propagation

### Exemple de Test

```bash
# Démarrer le serveur
npm start

# Se connecter avec un client WebSocket (ex: wscat)
wscat -c ws://localhost:3000

# Changer un state dans Home Assistant
# Vérifier que la notification est reçue
```

## Dépannage

### Problème : Les clients ne reçoivent pas les notifications

**Causes possibles :**
- NotificationService non injecté
- Aucun client connecté
- Erreur dans la connexion WebSocket

**Solutions :**
- Vérifier que `setNotificationService()` est appelé
- Vérifier les logs pour les connexions clients
- Vérifier les erreurs dans la console

### Problème : Les notifications sont en retard

**Causes possibles :**
- Problème de connexion à Home Assistant
- Trop de clients connectés
- Problème réseau

**Solutions :**
- Vérifier la connexion à Home Assistant
- Limiter le nombre de clients
- Vérifier la latence réseau

## Extensions Futures

### Fonctionnalités Potentielles

1. **Filtrage des notifications** : Notifier uniquement les clients intéressés
2. **Batch processing** : Grouper les notifications pour réduire la charge
3. **Priorisation** : Traiter les notifications critiques en premier
4. **Historique** : Conserver un historique des notifications
5. **Reconnexion** : Notifier les clients des states manqués après reconnexion

## Conclusion

Ce système de propagation des states offre une communication en temps réel entre Home Assistant et les clients. Le traçage intégré permet de suivre chaque étape du processus, facilitant le débogage et l'analyse des performances. La propagation est automatique, efficace et scalable, adaptée aux applications nécessitant des mises à jour instantanées.