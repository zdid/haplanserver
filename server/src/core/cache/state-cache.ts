import HACache from './ha-cache';
import fs from 'fs';
import path from 'path';
import Tracer from '../../utils/tracer';

interface HAState {
  entity_id: string;
  state: string;
  attributes: any;
  last_changed: string;
  last_updated: string;
}

class StateCache {
  private cache: HACache<HAState[]>;
  private connection: any;
  private entityStates: Map<string, HAState>;
  private firstLoad: boolean;
  private notificationService: any;

  constructor(connection: any, ttl: number = 300000) {
    this.connection = connection;
    this.cache = new HACache<HAState[]>(ttl);
    this.entityStates = new Map();
    this.firstLoad = true;
    this.notificationService = null;
  }

  setNotificationService(notificationService: any): void {
    this.notificationService = notificationService;
  }

  async getAllStates(forceRefresh: boolean = false): Promise<HAState[]> {
    if (!forceRefresh && this.cache.isValid()) {
      console.log('[TRACE] StateCache: Utilisation du cache des states');
      return this.cache.get()!;
    }

    console.log('[TRACE] StateCache: Chargement des states depuis Home Assistant...');
    const states = await this.loadStatesFromHA();
    console.log('[TRACE] StateCache: States reçus -', states.length, 'entités');
    this.cache.set(states);
    this.updateEntityMap(states);
    return states;
  }

  private async loadStatesFromHA(): Promise<HAState[]> {
    const states = await this.connection.sendMessagePromise({ type: "get_states" });
    
    // Écrire dans un fichier lors de la première récupération
    if (this.firstLoad) {
      await this.writeStatesToFile(states);
      this.firstLoad = false;
    }
    
    return states;
  }
  
  private async writeStatesToFile(states: HAState[]): Promise<void> {
    try {
      console.log('[TRACE] StateCache: Écriture des states dans un fichier...');
      
      const outputPath = path.join(__dirname, '../../states.json');
      const statesData = states.map(state => ({
        entity_id: state.entity_id,
        state: state.state,
        attributes: state.attributes,
        last_changed: state.last_changed,
        last_updated: state.last_updated
      }));
      
      fs.writeFileSync(outputPath, JSON.stringify(statesData, null, 2), 'utf8');
      
      console.log('[TRACE] StateCache: States écrits dans ' + outputPath);
      console.log('[TRACE] StateCache: Nombre d entités: ' + statesData.length);
      
    } catch (error) {
      console.error('[TRACE] StateCache: Erreur lors de l écriture des states:', error);
    }
  }

  private updateEntityMap(states: HAState[]): void {
    this.entityStates.clear();
    states.forEach(state => {
      this.entityStates.set(state.entity_id, state);
    });
  }

  getState(entity_id: string): HAState | undefined {
    return this.entityStates.get(entity_id);
  }

  updateState(state: HAState, traceContext?: any): void {
    // Créer ou continuer une trace pour cette mise à jour
    const context = traceContext 
      ? Tracer.continueTrace(traceContext, 'StateCache.updateState', {
          entity_id: state.entity_id,
          new_state: state.state
        })
      : Tracer.startTrace('StateCache.updateState', {
          entity_id: state.entity_id,
          new_state: state.state
        });

    console.log(`[TRACE] [${context.traceId}] StateCache: Mise à jour de state pour ${state.entity_id}`);
    console.log(`[TRACE] [${context.traceId}] Ancien state: ${this.entityStates.get(state.entity_id)?.state || 'N/A'} → Nouveau state: ${state.state}`);
    
    if(state.entity_id.startsWith('climate')) {
      console.log(`[TRACE] [${context.traceId}] Climate attributes:`, state.attributes);
    }

    // Mettre à jour le cache des entités
    this.entityStates.set(state.entity_id, state);
    console.log(`[TRACE] [${context.traceId}] Cache des entités mis à jour`);
    
    // Mettre à jour le cache principal
    const currentStates = this.cache.get() || [];
    const updatedStates = currentStates.map(s =>
      s.entity_id === state.entity_id ? state : s
    );
    this.cache.set(updatedStates);
    console.log(`[TRACE] [${context.traceId}] Cache principal mis à jour`);
    
    Tracer.endTrace(context, 'SUCCESS', {
      cacheUpdated: true,
      entity_id: state.entity_id,
      new_state: state.state
    });
  }

  startListening(): void {
    this.connection.subscribeEvents((event: any) => {
      if (event.event_type === "state_changed") {
        // Créer une trace pour cette mise à jour de state
        const traceContext = Tracer.startTrace('StateCache.stateChanged', {
          entity_id: event.data.new_state.entity_id,
          old_state: event.data.old_state?.state,
          new_state: event.data.new_state.state
        });
        
        console.log(`[TRACE] [${traceContext.traceId}] StateCache: Changement de state détecté pour ${event.data.new_state.entity_id}`);
        console.log(`[TRACE] [${traceContext.traceId}] Ancien state: ${event.data.old_state?.state || 'N/A'} → Nouveau state: ${event.data.new_state.state}`);
        console.log(`[TRACE] [${traceContext.traceId}] CONFIRMATION: Cet événement provient directement de Home Assistant`);
        
        // Mettre à jour le state
        this.updateState(event.data.new_state, traceContext);
        
        // Notifier les clients avec le contexte de trace
        if (this.notificationService) {
          const notificationTrace = Tracer.continueTrace(traceContext, 'StateCache.notifyClients', {
            entity_id: event.data.new_state.entity_id,
            new_state: event.data.new_state.state
          });
          
          console.log(`[TRACE] [${notificationTrace.traceId}] StateCache: Demande de notification aux clients`);
          console.log(`[TRACE] [${notificationTrace.traceId}] CONFIRMATION: C'est le StateCache qui demande la diffusion`);
          
          // Notifier les clients
          this.notificationService.broadcastUpdate('state', {
            entity_id: event.data.new_state.entity_id,
            state: event.data.new_state.state,
            attributes: event.data.new_state.attributes,
            last_changed: event.data.new_state.last_changed,
            last_updated: event.data.new_state.last_updated
          }, notificationTrace);
          
          console.log(`[TRACE] [${notificationTrace.traceId}] StateCache: Notification envoyée aux clients via NotificationService`);
        } else {
          console.warn(`[TRACE] [${traceContext.traceId}] StateCache: Avertissement - NotificationService non disponible, les clients ne seront pas notifiés`);
        }
        
        Tracer.endTrace(traceContext, 'SUCCESS', {
          stateUpdate: 'State updated and clients notified',
          confirmation: 'Cache mis à jour et diffusion demandée'
        });
      }
    }, "state_changed");
  }
}

export default StateCache;