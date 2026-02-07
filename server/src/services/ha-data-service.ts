import TreeCache from '../core/cache/tree-cache';
import StateCache from '../core/cache/state-cache';
import NotificationService from './notification-service';


class HADataService {
  private treeCache: TreeCache;
  private stateCache: StateCache;
  private connection: any;
  private notificationService?: NotificationService;

  constructor(connection: any, configManager?: any) {
    this.connection = connection;
    this.treeCache = new TreeCache(connection, configManager);
    this.stateCache = new StateCache(connection);
   }

  setNotificationService(notificationService: NotificationService): void {
    this.notificationService = notificationService;
    this.stateCache.setNotificationService(notificationService);
  }

  async initialize(): Promise<void> {
    console.log('[TRACE] HADataService: Initialisation des caches...');
    await Promise.all([
      this.treeCache.getTree(true),
      this.stateCache.getAllStates(true),
    ]);
    console.log('[TRACE] HADataService: Caches initialisés, démarrage de l\'écoute des states...');
    this.stateCache.startListening();
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

  getConnection(): any {
    return this.connection;
  }

  async executeCommand(entity_id: string, service: string, service_data?: any): Promise<void> {
    console.log(`Exécution de la commande: ${entity_id} -> ${service}`);
    
    const [domain, serviceAction] = service.split('.');
    
    if (!domain || !serviceAction) {
      throw new Error(`Format de service invalide: ${service}`);
    }

    // Utiliser sendMessagePromise au lieu de callService (deprecated)
    await this.connection.sendMessagePromise({
      type: 'call_service',
      domain: domain,
      service: serviceAction,
      service_data: {
        entity_id: entity_id,
        ...service_data
      }
    });
    
    console.log(`Commande exécutée avec succès pour ${entity_id}`);
  }
}

export default HADataService;