import HACache from './ha-cache';
import fs from 'fs';
import path from 'path';

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
    this.cache.set(states);
    this.updateEntityMap(states);
    return states;
  }

  private async loadStatesFromHA(): Promise<HAState[]> {
    const states = await this.connection.sendMessagePromise({ type: "get_states" });
    for (const state of states) {
      delete state.context; // Supprimer le champ context pour alléger les données
      delete state.last_changed; // Supprimer last_changed si pas nécessaire
      delete state.last_updated; // Supprimer last_updated si pas nécessaire
      delete state.last_reported
    } 
    
    // Écrire dans un fichier lors de la première récupération
    // if (this.firstLoad) {
    //   await this.writeStatesToFile(states);
    //   this.firstLoad = false;
    // }
    
    return states;
  }
  
  // private async writeStatesToFile(states: HAState[]): Promise<void> {
  //   try {
  //     console.log('[TRACE] StateCache: Écriture des states dans un fichier...');
      
  //     const outputPath = path.join(__dirname, '../../states.json');
  //     const statesData = states.map(state => ({
  //       entity_id: state.entity_id,
  //       state: state.state,
  //       attributes: state.attributes,
  //       last_changed: state.last_changed,
  //       last_updated: state.last_updated
  //     }));
      
  //     fs.writeFileSync(outputPath, JSON.stringify(statesData, null, 2), 'utf8');
      
  //     console.log('[TRACE] StateCache: States écrits dans ' + outputPath);
  //     console.log('[TRACE] StateCache: Nombre d entités: ' + statesData.length);
      
  //   } catch (error) {
  //     console.error('[TRACE] StateCache: Erreur lors de l écriture des states:', error);
  //   }
  // }

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
    // Mettre à jour le cache des entités
    this.entityStates.set(state.entity_id, state);
    // Mettre à jour le cache principal
    const currentStates = this.cache.get() || [];
    const updatedStates = currentStates.map(s =>
      s.entity_id === state.entity_id ? state : s
    );
    this.cache.set(updatedStates);
  }

  startListening(): void {
    this.connection.subscribeEvents((event: any) => {
      if (event.event_type === "state_changed") {
        const entity_id = event.data.new_state.entity_id;
        
        // 💡 Trace spéciale pour light.bureau_plafonnier
        if (entity_id === 'light.bureau_plafonnier') {
          console.log('═══════════════════════════════════════════════════');
          console.log(`💡 [StateCache] state_changed reçu pour ${entity_id}`);
          console.log('[StateCache] new_state brut:', JSON.stringify(event.data.new_state, null, 2));
        }

        let state: any = event.data.new_state;
        delete state.context; // Supprimer le champ context pour alléger les données
        delete state.last_changed;
        delete state.last_updated;
        delete state.last_reported;
        
        if (entity_id === 'light.bureau_plafonnier') {
          console.log('[StateCache] new_state allégé:', JSON.stringify(state, null, 2));
        }
        // Mettre à jour le state
        this.updateState(event.data.new_state);
        if (entity_id === 'light.bureau_plafonnier') {
          console.log('[StateCache] updateState effectué');
        }
        
        // Notifier les clients avec le contexte de trace
        if (this.notificationService) {
          if (entity_id === 'light.bureau_plafonnier') {
            console.log('[StateCache] broadcastToAll(state) en cours');
          }
          // Transmettre directement le new_state complet de Home Assistant
          this.notificationService.broadcastToAll('state', state);
          if (entity_id === 'light.bureau_plafonnier') {
            console.log('[StateCache] broadcastToAll(state) terminé');
            console.log('═══════════════════════════════════════════════════');
          }
        } else {
          console.warn(`[TRACE] StateCache: Avertissement - NotificationService non disponible, les clients ne seront pas notifiés`);
        }
      }
    }, "state_changed");
  }
}

export default StateCache;