import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class ConfigManager {
  private configDir: string;
  private haConfig: any;
  private serverConfig: any;

  constructor(configDir: string = '../../../config') {
    this.configDir = path.resolve(__dirname, configDir);
    console.log('Config dir:', this.configDir);
    this.loadConfigs();
    this.validateConfigs();
  }

  private loadConfigs(): void {
    try {
      const envHaConfig = {
        apiKey: process.env.HA_API_KEY,
        url: process.env.HA_URL,
        verifySSL: process.env.HA_VERIFY_SSL === 'false' ? false : true,
        reconnectInterval: parseInt(process.env.HA_RECONNECT_INTERVAL || '5000')
      };

      let fileHaConfig = {};
      try {
        const haConfigPath = path.join(this.configDir, 'ha-config.json');
        if (fs.existsSync(haConfigPath)) {
          fileHaConfig = JSON.parse(fs.readFileSync(haConfigPath, 'utf8')).homeAssistant;
        }
      } catch (fileError) {
        console.warn("Avertissement: Impossible de charger ha-config.json");
      }

      this.haConfig = {
        ...envHaConfig,
        ...fileHaConfig
      };

      const serverConfigPath = path.join(this.configDir, 'server-config.json');
      this.serverConfig = JSON.parse(fs.readFileSync(serverConfigPath, 'utf8'));

    } catch (error) {
      console.error("Erreur de chargement des configurations:", error);
      throw error;
    }
  }

  private validateConfigs(): void {
    if (!this.haConfig.apiKey) {
      throw new Error("La clé API Home Assistant est requise");
    }
    if (!this.haConfig.url) {
      throw new Error("L'URL Home Assistant est requise");
    }
  }

  getHAConfig(): any {
    const config = JSON.parse(JSON.stringify(this.haConfig));
    if (config.apiKey) {
      config.apiKey = config.apiKey.substring(0, 4) + '...' + config.apiKey.substring(config.apiKey.length - 4);
    }
    return config;
  }

  getHAConnectionConfig(): any {
    return JSON.parse(JSON.stringify(this.haConfig));
  }

  getServerConfig(): any {
    return JSON.parse(JSON.stringify(this.serverConfig));
  }

  // ===== CHEMINS (responsabilité de ConfigManager) =====

  // Méthode pour obtenir le répertoire d'upload
  getUploadDir(): string {
    return this.serverConfig.paths?.uploadDir || 'uploads';
  }

  // Méthode pour obtenir le chemin complet du répertoire d'upload
  getFullUploadPath(): string {
    return path.join(__dirname, '../../../', this.getUploadDir());
  }

  // Méthode pour obtenir le chemin du fichier client-floorplans.json
  getClientFloorplansPath(): string {
    return path.join(this.configDir, 'client-floorplans.json');
  }

  // Méthode pour obtenir le répertoire de configuration
  getConfigDir(): string {
    return this.configDir;
  }

  // Méthode pour vérifier si l'écriture des collections est activée
  shouldWriteCollectionsToDisk(): boolean {
    return this.serverConfig.debug?.writeCollectionsToDisk || false;
  }

  // Méthode pour obtenir le chemin de sortie des collections
  getCollectionsOutputPath(): string {
    return this.serverConfig.debug?.collectionsOutputPath || './collections';
  }

  // Méthode pour obtenir le chemin complet du répertoire de sortie des collections
  getFullCollectionsOutputPath(): string {
    return path.join(__dirname, '../../../', this.getCollectionsOutputPath());
  }
}

export default ConfigManager;