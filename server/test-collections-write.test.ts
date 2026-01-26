import TreeCache from './src/core/cache/tree-cache';
import ConfigManager from './src/core/config-manager';
import fs from 'fs';
import path from 'path';

describe('TreeCache Collections Write Feature', () => {
  let mockConnection: any;
  let configManager: ConfigManager;
  let treeCache: TreeCache;
  
  beforeAll(() => {
    // Créer un mock de connexion
    mockConnection = {
      sendMessagePromise: jest.fn().mockImplementation((message: any) => {
        if (message.type === "config/area_registry/list") {
          return Promise.resolve([
            { area_id: 'area1', name: 'Living Room' },
            { area_id: 'area2', name: 'Kitchen' }
          ]);
        } else if (message.type === "config/device_registry/list") {
          return Promise.resolve([
            { id: 'device1', name: 'Smart Light', area_id: 'area1' },
            { id: 'device2', name: 'Thermostat', area_id: 'area2' }
          ]);
        } else if (message.type === "config/entity_registry/list") {
          return Promise.resolve([
            { entity_id: 'light.living_room', device_id: 'device1' },
            { entity_id: 'climate.kitchen', device_id: 'device2' }
          ]);
        }
        return Promise.resolve([]);
      })
    };
    
    // Créer un ConfigManager avec la configuration de test
    configManager = new ConfigManager();
  });
  
  test('should write collections to disk when enabled', async () => {
    // Créer le TreeCache avec le ConfigManager
    treeCache = new TreeCache(mockConnection, configManager);
    
    // Appeler getTree pour déclencher le chargement des collections
    await treeCache.getTree(true);
    
    // Vérifier que les fichiers ont été créés
    const collectionsDir = path.join(__dirname, '../collections');
    const files = fs.readdirSync(collectionsDir);
    
    // Filtrer les fichiers de collections
    const collectionFiles = files.filter(file => 
      file.startsWith('areas-') || file.startsWith('devices-') || file.startsWith('entities-')
    );
    
    expect(collectionFiles.length).toBeGreaterThan(0);
    expect(collectionFiles.some(f => f.startsWith('areas-'))).toBe(true);
    expect(collectionFiles.some(f => f.startsWith('devices-'))).toBe(true);
    expect(collectionFiles.some(f => f.startsWith('entities-'))).toBe(true);
  });
  
  test('should not write collections to disk when disabled', async () => {
    // Créer un ConfigManager avec la fonction désactivée
    const mockConfigManager = {
      shouldWriteCollectionsToDisk: () => false,
      getCollectionsOutputPath: () => './collections'
    };
    
    // Créer le TreeCache avec le ConfigManager mocké
    treeCache = new TreeCache(mockConnection, mockConfigManager);
    
    // Appeler getTree
    await treeCache.getTree(true);
    
    // Vérifier que les fichiers n'ont pas été créés
    const collectionsDir = path.join(__dirname, '../collections');
    const filesBefore = fs.readdirSync(collectionsDir).filter(file => 
      file.startsWith('areas-') || file.startsWith('devices-') || file.startsWith('entities-')
    );
    
    // Attendre un peu pour s'assurer que rien n'est écrit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const filesAfter = fs.readdirSync(collectionsDir).filter(file => 
      file.startsWith('areas-') || file.startsWith('devices-') || file.startsWith('entities-')
    );
    
    // Le nombre de fichiers ne devrait pas avoir augmenté
    expect(filesAfter.length).toBe(filesBefore.length);
  });
});