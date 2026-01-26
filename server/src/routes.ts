import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import HADataService from './services/ha-data-service';
import NotificationService from './services/notification-service';
import HACommandService from './services/ha-command-service';
import { WebSocketServer } from 'ws';
import logger from './utils/logger';
import Tracer from './utils/tracer';
import path from 'path';
import fs from 'fs';
import ConfigManager from './core/config-manager';


const upload = multer({ dest: 'uploads/' });

export default function setupRoutes(
  app: Express,
  haDataService: HADataService,
  notificationService: NotificationService,
  wss: WebSocketServer,
  configManager: ConfigManager
): void {
  app.use(express.json());

  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

  app.get('/api/data', async (req: Request, res: Response) => {
    try {
      console.log('[TRACE] Route /api/data: Requête reçue');
      const [tree, states ] = await Promise.all([
        haDataService.getTree(),
        haDataService.getAllStates()
      ]);
      let clientPositions = haDataService.getClientPositions()
      console.log('[TRACE] Route /api/data: Données récupérées - clientPositions-', clientPositions)
      console.log('[TRACE] Route /api/data: Données récupérées - Arborescence:', tree.length, 'areas, States:', states.length, 'entités');
      console.log('[TRACE] Route /api/data: Envoi de la réponse au client');
      
      // Convertir les states en objet avec entity_id comme clé
      const statesObject: Record<string, any> = {};
      states.forEach((state: any) => {
        statesObject[state.entity_id] = state;
      });

      // Structurer l'arborescence avec entity_id comme clé pour les entités
      // const structuredTree = tree.map((area: any) => ({
      //   ...area,
      //   devices: area.devices.map((device : any) => ({
      //     ...device,
      //     entities: device.entities.reduce((acc: any, entity: any) => {
      //       acc[entity.entity_id] = entity;
      //       return acc;
      //     }, {})
      //   }))
      // }));

      // Récupérer le chemin du plan actuel
      const currentFloorplanPath = haDataService.getCurrentFloorplanPath();
      let floorplanData = null;
      
      if (currentFloorplanPath) {
        floorplanData = {
          path: `${req.protocol}://${req.get('host')}/${currentFloorplanPath}`,
          filename: path.basename(currentFloorplanPath)
        };
        console.log('[TRACE] Route /api/data: Plan actuel -', floorplanData.path);
      }
      
      res.json({
        success: true,
        data: {
          tree: tree, //structuredTree,
          states: statesObject,
          config: clientPositions,
          floorplan: floorplanData
        }
      });
    } catch (error) {
      logger.error("[TRACE] Route /api/data: Erreur:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  });



  app.post('/api/floorplan/upload', upload.single('floorplan'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Aucun fichier uploadé" });
      }
 

      console.log('[TRACE] Route /api/floorplan/upload: Fichier reçu -', {
        originalname: req.file.originalname,
        tempPath: req.file.path
      });

      // 1. Supprimer tous les fichiers présents dans le répertoire uploads sauf celui qui vient d'être reçu
      const uploadDir = configManager.getUploadDir();
      const files = await fs.promises.readdir(uploadDir);
      
      console.log('[TRACE] Route /api/floorplan/upload: Fichiers existants dans uploads:', files);
      
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        
        // Ne pas supprimer le fichier nouvellement uploadé
        if (filePath !== req.file.path) {
          try {
            await fs.promises.unlink(filePath);
            console.log('[TRACE] Route /api/floorplan/upload: Fichier supprimé:', filePath);
          } catch (err) {
            console.warn('[TRACE] Route /api/floorplan/upload: Impossible de supprimer:', filePath, err);
          }
        }
      }

      // 2. Renommer le fichier reçu avec son nom original
      const newFilePath = path.join(uploadDir, req.file.originalname);
      await fs.promises.rename(req.file.path, newFilePath);
      
      console.log('[TRACE] Route /api/floorplan/upload: Fichier renommé:', {
        from: req.file.path,
        to: newFilePath
      });

      // Mettre à jour le chemin du plan actuel dans le service
      haDataService.setCurrentFloorplanPath(newFilePath);

      // Construire l'URL absolue pour le client
      const fileUrl = `${req.protocol}://${req.get('host')}/${configManager.getUploadDir()}/${req.file.originalname}`;
      console.log('routes upload: fileUrl :',fileUrl)
      
      notificationService.broadcastUpdate('floorplan', {
        path: fileUrl,
        filename: req.file.originalname
      });
      console.log('[TRACE] Route /api/floorplan/upload: Broadcast envoyé aux clients');

      res.json({
        success: true,
        message: "Fichier uploadé avec succès",
        path: fileUrl
      });
    } catch (error) {
      logger.error("[TRACE] Route /api/floorplan/upload: Erreur:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  });

  app.post('/api/config/save', (req: Request, res: Response) => {
    try {
      console.log('[TRACE] Route /api/config/save: Configuration reçue', req.body);
      
      // Sauvegarder la configuration via le ConfigManager
      configManager.savePositions(req.body);
      haDataService.setClientPositions(req.body)
      
      // Notifier les clients
      notificationService.broadcastUpdate('config', req.body);
      console.log('[TRACE] Route /api/config/save: Configuration sauvegardée et broadcast envoyé');
      
      res.json({ success: true, message: "Configuration sauvegardée" });
    } catch (error) {
      logger.error("[TRACE] Route /api/config/save: Erreur:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    }
  });

  app.post('/api/entities/command', async (req: Request, res: Response) => {
    try {
      const { entity_id, service, service_data } = req.body;

      console.log('[TRACE] Route /api/entities/command: Commande reçue -', entity_id, service);

      if (!entity_id || !service) {
        return res.status(400).json({
          success: false,
          error: "entity_id et service sont requis"
        });
      }

      // Créer un contexte de trace pour cette commande
      const traceContext = Tracer.startTrace('API.CommandReceived', {
        entity_id,
        service,
        service_data,
        clientIp: req.ip,
        userAgent: req.get('User-Agent')
      });

      console.log(`[TRACE] [${traceContext.traceId}] Commande API reçue - Entity: ${entity_id}, Service: ${service}`);

      // Créer le service de commande HA
      const haCommandService = new HACommandService(haDataService.getConnection());

      // Exécuter la commande avec traçage
      const result = await haCommandService.executeCommand(entity_id, service, service_data, traceContext);

      console.log(`[TRACE] [${traceContext.traceId}] Commande exécutée avec succès - Durée: ${result.duration}ms`);

      res.json({
        success: true,
        message: "Commande exécutée avec succès",
        traceId: result.traceId,
        duration: result.duration,
        result: result.result
      });
      
    } catch (error: any) {
      const traceId = error.traceId || 'unknown';
      logger.error(`[TRACE] [${traceId}] Route /api/entities/command: Erreur:`, error);
      
      res.status(500).json({
        success: false,
        error: error.error || 'Erreur inconnue',
        traceId: error.traceId,
        details: error.details
      });
    }
  });

  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}
