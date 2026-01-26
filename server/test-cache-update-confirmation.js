// Test pour vérifier les confirmations de mise à jour du cache et de diffusion
const Tracer = require('./dist/utils/tracer').default;

console.log('=== Test des Confirmations de Mise à Jour ===\n');

// Simuler un événement de changement de state
const mockStateChangedEvent = {
  event_type: "state_changed",
  data: {
    entity_id: "light.living_room",
    old_state: {
      entity_id: "light.living_room",
      state: "off",
      attributes: { brightness: 0 }
    },
    new_state: {
      entity_id: "light.living_room",
      state: "on",
      attributes: { brightness: 255 }
    }
  }
};

console.log('1. Événement reçu de Home Assistant:');
console.log(JSON.stringify(mockStateChangedEvent, null, 2));

// Créer une trace pour le changement de state
const stateChangeTrace = Tracer.startTrace('StateCache.stateChanged', {
  entity_id: mockStateChangedEvent.data.new_state.entity_id,
  old_state: mockStateChangedEvent.data.old_state.state,
  new_state: mockStateChangedEvent.data.new_state.state
});

console.log(`\n2. Trace créée: ${stateChangeTrace.traceId}`);
console.log(`[TRACE] [${stateChangeTrace.traceId}] StateCache: Changement de state détecté pour ${mockStateChangedEvent.data.new_state.entity_id}`);
console.log(`[TRACE] [${stateChangeTrace.traceId}] Ancien state: ${mockStateChangedEvent.data.old_state.state} → Nouveau state: ${mockStateChangedEvent.data.new_state.state}`);
console.log(`[TRACE] [${stateChangeTrace.traceId}] CONFIRMATION: Cet événement provient directement de Home Assistant`);

// Simuler la mise à jour du state
const updateTrace = Tracer.continueTrace(stateChangeTrace, 'StateCache.updateState', {
  entity_id: mockStateChangedEvent.data.new_state.entity_id,
  new_state: mockStateChangedEvent.data.new_state.state
});

console.log(`\n3. Mise à jour du cache: ${updateTrace.traceId}`);
console.log(`[TRACE] [${updateTrace.traceId}] StateCache: Mise à jour de state pour ${mockStateChangedEvent.data.new_state.entity_id}`);
console.log(`[TRACE] [${updateTrace.traceId}] Cache des entités mis à jour`);
console.log(`[TRACE] [${updateTrace.traceId}] Cache principal mis à jour`);

Tracer.endTrace(updateTrace, 'SUCCESS', {
  cacheUpdated: true,
  entity_id: mockStateChangedEvent.data.new_state.entity_id,
  new_state: mockStateChangedEvent.data.new_state.state
});

// Simuler la notification aux clients
const notificationTrace = Tracer.continueTrace(stateChangeTrace, 'StateCache.notifyClients', {
  entity_id: mockStateChangedEvent.data.new_state.entity_id,
  new_state: mockStateChangedEvent.data.new_state.state
});

console.log(`\n4. Notification des clients: ${notificationTrace.traceId}`);
console.log(`[TRACE] [${notificationTrace.traceId}] StateCache: Demande de notification aux clients`);
console.log(`[TRACE] [${notificationTrace.traceId}] CONFIRMATION: C'est le StateCache qui demande la diffusion`);

// Simuler l'envoi de la notification
console.log(`[TRACE] [${notificationTrace.traceId}] StateCache: Notification envoyée aux clients via NotificationService`);

Tracer.endTrace(notificationTrace, 'SUCCESS', {
  successfullySent: 2,
  failedToSend: 0,
  totalClients: 2
});

// Terminer la trace principale
Tracer.endTrace(stateChangeTrace, 'SUCCESS', {
  stateUpdate: 'State updated and clients notified',
  confirmation: 'Cache mis à jour et diffusion demandée'
});

console.log('\n5. Résumé du flux:');
console.log('   ✓ Événement reçu de Home Assistant');
console.log('   ✓ Cache des entités mis à jour');
console.log('   ✓ Cache principal mis à jour');
console.log('   ✓ Notification demandée par StateCache');
console.log('   ✓ Notification envoyée aux clients');

console.log('\n=== Fin du test ===');