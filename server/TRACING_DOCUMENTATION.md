# Documentation du Système de Traçage des Commandes

## Introduction

Ce système de traçage permet de suivre les commandes depuis leur réception par l'API jusqu'à leur exécution par Home Assistant et le retour de la réponse au client. Chaque commande est identifiée par un UUID unique qui permet de corrélér les différentes étapes du traitement.

## Architecture

### Composants principaux

1. **Tracer** (`src/utils/tracer.ts`): Service central de traçage qui génère des identifiants uniques et gère le cycle de vie des traces.

2. **HACommandService** (`src/services/ha-command-service.ts`): Service dédié à l'exécution des commandes Home Assistant avec traçage intégré.

3. **Endpoint API** (`src/routes.ts`): Point d'entrée des commandes avec création initiale des traces.

### Flux de traçage

```
Client → [API CommandReceived] → [HACommandService.executeCommand] → Home Assistant → [Réponse HA] → [Réponse API] → Client
```

Chaque étape crée une trace avec:
- `traceId`: Identifiant unique de la trace
- `parentId`: Identifiant de la trace parente (pour la corrélation)
- `operation`: Nom de l'opération en cours
- `timestamp`: Horodatage de l'opération
- `metadata`: Données contextuelles
- `status`: Statut final (SUCCESS/ERROR)
- `duration`: Durée de l'opération

## Utilisation

### Traçage d'une commande complète

```javascript
// 1. Réception de la commande (dans le endpoint API)
const traceContext = Tracer.startTrace('API.CommandReceived', {
  entity_id: req.body.entity_id,
  service: req.body.service,
  service_data: req.body.service_data,
  clientIp: req.ip,
  userAgent: req.get('User-Agent')
});

// 2. Exécution de la commande HA
const haCommandService = new HACommandService(connection);
const result = await haCommandService.executeCommand(
  entity_id, 
  service, 
  service_data, 
  traceContext  // Passage du contexte de trace
);

// 3. Réponse au client (avec traceId pour corrélation)
res.json({
  success: true,
  message: "Commande exécutée avec succès",
  traceId: result.traceId,  // Retour du traceId au client
  duration: result.duration,
  result: result.result
});
```

### Traçage manuel

Pour tracer des opérations personnalisées:

```javascript
// Démarrer une trace
const trace = Tracer.startTrace('MonOperation', { 
  parametre1: 'valeur1',
  parametre2: 'valeur2'
});

try {
  // Exécuter l'opération
  const result = await monOperation();
  
  // Terminer la trace avec succès
  Tracer.endTrace(trace, 'SUCCESS', { result });
  
} catch (error) {
  // Terminer la trace avec erreur
  Tracer.endTrace(trace, 'ERROR', null, {
    message: error.message,
    stack: error.stack
  });
}
```

### Continuation de trace

Pour créer des sous-opérations dans une trace existante:

```javascript
const parentTrace = Tracer.startTrace('OperationParente');

// Créer une sous-opération
const childTrace = Tracer.continueTrace(parentTrace, 'SousOperation', {
  details: 'informations supplémentaires'
});

try {
  await sousOperation();
  Tracer.endTrace(childTrace, 'SUCCESS');
} catch (error) {
  Tracer.endTrace(childTrace, 'ERROR', null, error);
}

// Terminer la trace parente
Tracer.endTrace(parentTrace, 'SUCCESS');
```

## Format des traces

### Trace de début (START)

```json
{
  "traceType": "START",
  "traceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "operation": "NomDeLOperation",
  "timestamp": 1234567890123,
  "metadata": {}
}
```

### Trace de continuation (CONTINUE)

```json
{
  "traceType": "CONTINUE",
  "traceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "parentId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "operation": "NomDeLOperation",
  "timestamp": 1234567890123,
  "metadata": {}
}
```

### Trace de fin (END)

```json
{
  "traceType": "END",
  "traceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "parentId": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "operation": "NomDeLOperation",
  "timestamp": 1234567890123,
  "duration": 42,
  "status": "SUCCESS|ERROR",
  "metadata": {},
  "result": {},  // Présent uniquement en cas de succès
  "error": {}    // Présent uniquement en cas d'erreur
}
```

## Exemple complet

Voir `test-command-flow.js` pour un exemple complet de flux de commande avec traçage.

## Journalisation

Les traces sont automatiquement journalisées dans la console au format JSON structuré avec le préfixe `[TRACE]`.

Exemple de sortie:
```
[TRACE] [START] {"traceType":"START","traceId":"2a778b3d-eebf-40aa-83fa-296b5b1f32f8","operation":"API.CommandReceived","timestamp":1769191797503,"metadata":{"entity_id":"light.living_room","service":"light.turn_on","clientIp":"192.168.1.100"}}
[TRACE] [CONTINUE] {"traceType":"CONTINUE","traceId":"c76111c3-4706-4218-a2a0-49cc791f422f","parentId":"2a778b3d-eebf-40aa-83fa-296b5b1f32f8","operation":"HACommandService.executeCommand","timestamp":1769191797503}
[TRACE] [END] {"traceType":"END","traceId":"c76111c3-4706-4218-a2a0-49cc791f422f","parentId":"2a778b3d-eebf-40aa-83fa-296b5b1f32f8","operation":"HACommandService.executeCommand","timestamp":1769191797503,"duration":1004,"status":"SUCCESS"}
[TRACE] [END] {"traceType":"END","traceId":"2a778b3d-eebf-40aa-83fa-296b5b1f32f8","operation":"API.CommandReceived","timestamp":1769191797503,"duration":1004,"status":"SUCCESS"}
```

## Intégration avec les outils de monitoring

Les traces peuvent être facilement intégrées avec des outils comme:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Graylog**
- **Datadog**

Il suffit de configurer ces outils pour parser les logs avec le préfixe `[TRACE]` et analyser le JSON structuré.

## Bonnes pratiques

1. **Noms d'opérations clairs**: Utilisez des noms descriptifs pour les opérations
2. **Metadata pertinente**: Incluez les informations contextuelles importantes
3. **Gestion des erreurs**: Toujours terminer les traces même en cas d'erreur
4. **Corrélation**: Utilisez toujours `continueTrace` pour les sous-opérations
5. **Performance**: Évitez d'inclure des objets volumineux dans les metadata

## Dépannage

- **Problème**: Les traces ne s'affichent pas
  **Solution**: Vérifiez que le niveau de log est suffisant (INFO ou DEBUG)

- **Problème**: Les traceIds ne correspondent pas
  **Solution**: Vérifiez que vous utilisez bien `continueTrace` avec le bon contexte parent

- **Problème**: Durée incorrecte
  **Solution**: Assurez-vous que les appels à `startTrace` et `endTrace` sont bien appariés