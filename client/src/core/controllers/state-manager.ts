import { AppState, FloorplanObject, PositionData } from '../types/client-types';
import { HAEntity, HAState } from '../types/ha-types';
import { APIService } from '../services/api-service';

export class StateManager {
  private state: AppState;
  private listeners: ((state: AppState) => void)[] = [];
  private saveTimeout: number | null = null;
  private apiService: APIService;

  constructor(apiService: APIService) {
    this.apiService = apiService;
    this.state = {
      mode: 'normal',
      hasFloorplan: false,
      isFirstUpload: true,
      objects: [],
      availableEntities: [],
      lastRefresh: 0,
      isSaving: false,
      lastSaveTime: 0
    };
  }

  getState(): AppState {
    return { ...this.state };
  }

  updateState(partialState: Partial<AppState>): void {
    this.state = { ...this.state, ...partialState };
    this.notifyListeners();
  }

  subscribe(listener: (state: AppState) => void): void {
    this.listeners.push(listener);
    // Envoyer l'état actuel au nouvel abonné
    listener(this.getState());
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Gestion des objets
  addObject(object: FloorplanObject): void {
    const newObjects = [...this.state.objects, object];
    this.updateState({ objects: newObjects });
    this.scheduleSave();
  }

  updateObject(entity_id: string, updates: Partial<FloorplanObject>): void {
    const newObjects = this.state.objects.map(obj =>
      obj.entity_id === entity_id ? { ...obj, ...updates } : obj
    );
    this.updateState({ objects: newObjects });
    this.scheduleSave();
  }

  removeObject(entity_id: string): void {
    const newObjects = this.state.objects.filter(obj => obj.entity_id !== entity_id);
    this.updateState({ objects: newObjects });
    this.scheduleSave();
  }

  private scheduleSave(): void {
    // Annuler le timeout précédent s'il existe
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Programmer la sauvegarde après 5 secondes d'inactivité
    this.saveTimeout = window.setTimeout(() => {
      this.savePositions();
    }, 5000);
  }

  async savePositions(): Promise<void> {
    if (this.state.isSaving) return;

    this.updateState({ isSaving: true });

    try {
      const positionData: PositionData = {
        version: '1.0',
        timestamp: Date.now(),
        objects: this.state.objects
      };

      // Sauvegarder les positions via l'API
      await this.apiService.savePositions(positionData);

      this.updateState({
        isSaving: false,
        lastSaveTime: Date.now()
      });
      
      console.log('[TRACE] StateManager: Positions sauvegardées:', positionData);
    } catch (error) {
      console.error('Failed to save positions:', error);
      this.updateState({ isSaving: false });
    }
  }

  // Gestion des entités disponibles
  updateAvailableEntities(entities: HAEntity[]): void {
    const placedEntity_ids = this.state.objects.map(obj => obj.entity_id);
    const available = entities.filter(entity => 
      !placedEntity_ids.includes(entity.entity_id) &&
      this.isDisplayableEntity(entity)
    );
    
    this.updateState({ availableEntities: available });
  }

  private isDisplayableEntity(entity: HAEntity): boolean {
    const excludedDomains = ['diagnostic', 'config', 'system'];
    const excludedEntity_ids = ['sensor.date', 'sensor.time'];
    
    return !excludedDomains.includes(entity.domain) &&
           !excludedEntity_ids.includes(entity.entity_id) &&
           entity.visible !== false;
  }

  // Gestion des states
  updateStateForEntity(entity_id: string, state: HAState): void {
    // Mettre à jour l'état dans les objets si nécessaire
    const object = this.state.objects.find(obj => obj.entity_id === entity_id);
    if (object) {
      // Ici on pourrait mettre à jour des propriétés spécifiques
      // selon le type d'objet
    }
  }

  // Gestion du mode
  enterParametrageMode(): void {
    this.updateState({ mode: 'parametrage' });
  }

  exitParametrageMode(): void {
    if (!this.state.hasFloorplan) {
      throw new Error('Cannot exit parametrage mode without floorplan');
    }
    this.updateState({ mode: 'normal' });
  }

  onFloorplanUploaded(): void {
    this.updateState({
      hasFloorplan: true,
      isFirstUpload: false
    });
  }
}
