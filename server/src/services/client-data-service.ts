import fs from 'fs';
import path from 'path';

interface Position {
  entity_id: string;
  x: number;
  y: number;
}

interface FloorplanInfo {
  id: string;
  name: string;
  filename: string;
}

interface FloorplanConfig {
  filename: string;
  positions: Position[];
}

class ClientDataService {
  private floorplansConfig: Record<string, FloorplanConfig>;
  private configFilePath: string;
  private configManager?: any;

  constructor(configManager?: any) {
    this.floorplansConfig = {};
    this.configManager = configManager;
    this.configFilePath = configManager ? 
      configManager.getClientFloorplansPath()
      : path.join(__dirname, '../../config/client-floorplans.json');
  }

  // Charger la configuration depuis le fichier
  async loadConfiguration(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.configFilePath, 'utf-8');
      this.floorplansConfig = JSON.parse(data);
      console.log('Configuration chargée:', Object.keys(this.floorplansConfig));
    } catch (error) {
      console.error('Erreur lors de la lecture de la configuration:', error);
      this.floorplansConfig = {};
    }
  }

  // Sauvegarder la configuration dans le fichier
  private async saveConfiguration(): Promise<void> {
    try {
      console.log('[TRACE] ClientDataService.saveConfiguration: début', {
        path: this.configFilePath,
        plansCount: Object.keys(this.floorplansConfig).length
      });
      await fs.promises.writeFile(
        this.configFilePath,
        JSON.stringify(this.floorplansConfig, null, 2),
        'utf-8'
      );
      console.log('[TRACE] ClientDataService.saveConfiguration: terminé');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la configuration:', error);
    }
  }

  // Obtenir toute l'arborescence des plans avec leurs positions
  getFloorplansHierarchy(): Record<string, FloorplanConfig> {
    return this.floorplansConfig;
  }

  // Obtenir tous les plans avec leurs infos
  getAvailableFloorplans(): FloorplanInfo[] {
    const floorplans: FloorplanInfo[] = [];
    
    for (const [id, config] of Object.entries(this.floorplansConfig)) {
      floorplans.push({
        id: id,
        name: id,
        filename: config.filename
      });
    }
    
    return floorplans;
  }

  // Obtenir un plan spécifique
  getFloorplan(floorplanId: string): FloorplanInfo | null {
    const config = this.floorplansConfig[floorplanId];
    if (!config) {
      return null;
    }
    
    return {
      id: floorplanId,
      name: floorplanId,
      filename: config.filename
    };
  }

  // Supprimer un plan
  async deleteFloorplan(floorplanId: string): Promise<boolean> {
    if (!this.floorplansConfig[floorplanId]) {
      return false;
    }
    
    delete this.floorplansConfig[floorplanId];
    await this.saveConfiguration();
    return true;
  }

  // Créer un nouveau plan
  async createFloorplan(name: string, filename: string): Promise<FloorplanInfo | null> {
    console.log('[TRACE] ClientDataService.createFloorplan: début', { name, filename });
    if (this.floorplansConfig[name]) {
      console.warn(`Plan '${name}' existe déjà`);
      return null;
    }
    
    this.floorplansConfig[name] = {
      filename: filename,
      positions: []
    };
    
    await this.saveConfiguration();

    console.log('[TRACE] ClientDataService.createFloorplan: terminé', {
      name,
      filename
    });
    
    return this.getFloorplan(name);
  }

  async updateFloorplanFilename(name: string, filename: string): Promise<boolean> {
    if (!this.floorplansConfig[name]) {
      return false;
    }

    console.log('[TRACE] ClientDataService.updateFloorplanFilename: debut', { name, filename });
    this.floorplansConfig[name].filename = filename;
    await this.saveConfiguration();
    console.log('[TRACE] ClientDataService.updateFloorplanFilename: termine', { name, filename });
    return true;
  }

  
  // Définir les positions pour un plan spécifique
  async setClientPositionsForFloorplan(
    floorplanId: string,
    positions: Position[]
  ): Promise<boolean> {
    if (!this.floorplansConfig[floorplanId]) {
      return false;
    }
    
    this.floorplansConfig[floorplanId].positions = positions;
    await this.saveConfiguration();
    return true;
  }

  
  // Initialiser le service
  async initialize(): Promise<void> {
    await this.loadConfiguration();
    console.log('ClientDataService initialisé avec', Object.keys(this.floorplansConfig).length, 'plans');
  }
}

export default ClientDataService;