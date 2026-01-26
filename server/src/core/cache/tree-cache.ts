import HACache from './ha-cache';
import fs, { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path';
import * as  yaml from 'js-yaml';

interface AreaNode {
  id: string;
  name: string;
  devices: DeviceNode[];
}

interface DeviceNode {
  id: string;
  name: string;
  entities: EntityNode[];
}

interface EntityNode {
  entity_id: string;
}

type HATree = AreaNode[];

class TreeCache {
  private cache: HACache<HATree>;
  private connection: any;

  private configManager: any;
  
  constructor(connection: any, configManager: any, ttl: number = 300000) {
    this.connection = connection;
    this.cache = new HACache<HATree>(ttl);
    this.configManager = configManager;
  }

  private async writeCollectionsToDisk(areas: any[], devices: any[], entities: any[], tree: any[]): Promise<void> {
    try {
      const outputDir = path.resolve(path.join(__dirname, '../../../../collections'));
      
      // Créer le répertoire s'il n'existe pas
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
        console.log('[TRACE] TreeCache: Répertoire de collections créé:', outputDir);
      }

      // Écrire chaque collection dans un fichier séparé
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      writeFileSync(path.join(outputDir, `areas-${timestamp}.yaml`), yaml.dump(areas));
      writeFileSync(path.join(outputDir, `devices-${timestamp}.yaml`), yaml.dump(devices));
      writeFileSync(path.join(outputDir, `entities-${timestamp}.yaml`), yaml.dump(entities));
      writeFileSync(path.join(outputDir, `tree-${timestamp}.yaml`), yaml.dump(tree));
      
      console.log('[TRACE] TreeCache: Collections écrites sur disque dans', outputDir);
      
    } catch (error) {
      console.error('[TRACE] TreeCache: Erreur lors de l écriture des collections:', error);
    }
  }

  async getTree(forceRefresh: boolean = false): Promise<HATree> {
    if (!forceRefresh && this.cache.isValid()) {
      console.log('[TRACE] TreeCache: Utilisation du cache existant');
      return this.cache.get()!;
    }

    console.log('[TRACE] TreeCache: Chargement des données depuis Home Assistant...');
    const tree = await this.loadTreeFromHA();
    console.log('[TRACE] TreeCache: Arborescence construite avec', tree.length, 'areas');
    this.cache.set(tree);
    return tree;
  }

  private async loadTreeFromHA(): Promise<HATree> {
    console.log('[TRACE] TreeCache: Récupération des collections depuis HA...');
    const [areas, devices, entities] = await Promise.all([
      this.connection.sendMessagePromise({ type: "config/area_registry/list" }),
      this.connection.sendMessagePromise({ type: "config/device_registry/list" }),
      this.connection.sendMessagePromise({ type: "config/entity_registry/list" })
    ]);

    console.log('[TRACE] TreeCache: Collections reçues -', {
      areas: areas.length,
      devices: devices.length,
      entities: entities.length
    });

     const tree = areas.map((area: any) => ({
      id: area.area_id,
      name: area.name,
      devices: devices
        .filter((d: any) => d.area_id === area.area_id)
        .map((device: any) => ({
          id: device.id,
          name: device.name_by_user || device.name,
          tentities: entities
            .filter((e: any) => e.device_id === device.id)
            .map((entity: any) => ({
              ...entity,
              // Si le name de l'entité n'est pas alimenté, utiliser le name du device
              name: entity.name || device.name_by_user || device.name
            }))
        }))
    }));
    tree.forEach((area:any)=>{
      area.devices.forEach((device:any) => {
        device.entities= {}
        device.tentities.forEach((entity:any)=>{
          device.entities[entity.entity_id] = entity
        })
        device.tentities=null;
      });
    })
    console.log('[TRACE] TreeCache: Arborescence construite avec succès');
       // Écrire les collections sur disque si le paramètre est activé
    if (this.configManager && this.configManager.shouldWriteCollectionsToDisk()) {
      await this.writeCollectionsToDisk(areas, devices, entities, tree);
   }
    return tree;
  }

  updateCache(updatedData: any): void {
    this.cache.clear();
  }
}

export default TreeCache;