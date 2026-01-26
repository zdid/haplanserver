import TreeCache from '../core/cache/tree-cache';
import StateCache from '../core/cache/state-cache';
import fs from 'fs';
import path from 'path';
import NotificationService from './notification-service';

class HADataService {
  private treeCache: TreeCache;
  private stateCache: StateCache;
  private connection: any;
  private currentFloorplanPath: string | null;
  private clientPositions: any;
  private notificationService?: NotificationService;
  private configManager?: any;

  constructor(connection: any, configManager?: any) {
    this.connection = connection;
    this.treeCache = new TreeCache(connection, configManager);
    this.stateCache = new StateCache(connection);
    this.currentFloorplanPath = null;
    this.clientPositions = [];
    this.configManager = configManager;
  }

  setNotificationService(notificationService: NotificationService): void {
    this.notificationService = notificationService;
    this.stateCache.setNotificationService(notificationService);
  }

  async initialize(): Promise<void> {
    console.log('[TRACE] HADataService: Initialisation des caches...');
    await Promise.all([
      this.treeCache.getTree(true),
      this.stateCache.getAllStates(true)
    ]);
    console.log('[TRACE] HADataService: Caches initialisés, démarrage de l\'écoute des states...');
    this.stateCache.startListening();
    let plans = this.getAvailableFloorplans();
  }

  async getTree(): Promise<any> {
    console.log('[TRACE] HADataService: Récupération de l\'arborescence...');
    const tree = await this.treeCache.getTree();
    console.log('[TRACE] HADataService: Arborescence récupérée -', tree.length, 'areas');
    return tree;
  }

  async getAllStates(): Promise<any> {
    console.log('[TRACE] HADataService: Récupération des states...');
    const states = await this.stateCache.getAllStates();
    console.log('[TRACE] HADataService: States récupérés -', states.length, 'entités');
    return states;
  }

  getState(entity_id: string): any {
    return this.stateCache.getState(entity_id);
  }

  async refreshAll(): Promise<void> {
    await Promise.all([
      this.treeCache.getTree(true),
      this.stateCache.getAllStates(true)
    ]);
  }

  // Méthode pour obtenir le chemin du plan actuel
  getCurrentFloorplanPath(): string | null {
    return this.currentFloorplanPath;
  }

  // Méthode pour mettre à jour le chemin du plan
  setCurrentFloorplanPath(filePath: string): void {
    this.currentFloorplanPath = filePath;
  }

  getClientPositions(): any {
    return this.clientPositions;
  }

  setClientPositions( positions: any) {
    this.clientPositions =positions;
  }

  getConnection(): any {
    return this.connection;
  }
  // Méthode pour obtenir la liste des plans disponibles
  async getAvailableFloorplans(): Promise<string[]> {
    try {
      const uploadDir = path.join(__dirname, '../../uploads');
      const files = await fs.promises.readdir(uploadDir);
      return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext);
      });
    } catch (error) {
      console.error('Erreur lors de la lecture des plans:', error);
      return [];
    }
  }
}

export default HADataService;