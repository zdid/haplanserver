import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

import multer from 'multer';

import HADataService from './services/ha-data-service';
import ClientDataService from './services/client-data-service';
import NotificationService from './services/notification-service';
import { WebSocketServer } from 'ws';
import ConfigManager from './core/config-manager';
import { WebSocketHandler } from './websocket/WebSocketHandler';

const sanitizeFloorplanBaseName = (name: string): string => {
  const trimmed = name.trim();
  const sanitized = trimmed.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_');
  return sanitized.length > 0 ? sanitized : 'plan';
};

export default function setupRoutes(
  app: Express,
  haDataService: HADataService,
  clientDataService: ClientDataService,
  notificationService: NotificationService,
  wss: WebSocketServer,
  configManager: ConfigManager,
  wsHandler: WebSocketHandler
): void {
  app.use(express.json());

  const upload = multer({ dest: configManager.getFullUploadPath() });

   
  // ===== ROUTES POUR LES PLANS (FLOORPLANS) =====
 
  // Upload un nouveau plan
  app.post('/api/floorplan/upload', upload.single('floorplan'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Le nom du plan est requis' });
      }

      console.log('[TRACE] Upload plan: début', {
        name,
        description: description || null,
        file: {
          originalname: req.file.originalname,
          filename: req.file.filename,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        }
      });

      const uploadDir = configManager.getFullUploadPath();
      const safeBaseName = sanitizeFloorplanBaseName(name);
      const extension = path.extname(req.file.originalname || '').toLowerCase();
      const finalFilename = `${safeBaseName}${extension}`;
      const targetPath = path.join(uploadDir, finalFilename);

      const existingPlan = clientDataService.getFloorplan(name);
      let previousFilename: string | null = null;

      if (existingPlan) {
        previousFilename = existingPlan.filename;
        const updated = await clientDataService.updateFloorplanFilename(name, finalFilename);
        if (!updated) {
          console.warn('[TRACE] Upload plan: mise a jour echouee (plan introuvable)', { name });
          return res.status(400).json({ error: 'Erreur lors de la mise a jour du plan' });
        }
      } else {
        const created = await clientDataService.createFloorplan(name, finalFilename);
        if (!created) {
          console.warn('[TRACE] Upload plan: creation echouee (plan existant ou invalide)', { name });
          return res.status(400).json({ error: 'Erreur lors de la creation du plan' });
        }
      }

      await fs.promises.mkdir(uploadDir, { recursive: true });
      try {
        await fs.promises.unlink(targetPath);
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }

      console.log('[TRACE] Upload plan: renommage fichier', {
        from: req.file.path,
        to: targetPath
      });
      await fs.promises.rename(req.file.path, targetPath);

      if (previousFilename && previousFilename !== finalFilename) {
        const previousPath = path.join(uploadDir, previousFilename);
        if (previousPath !== targetPath) {
          try {
            await fs.promises.unlink(previousPath);
            console.log('[TRACE] Upload plan: ancien fichier supprime', { previousPath });
          } catch (error: any) {
            if (error?.code !== 'ENOENT') {
              console.warn('[TRACE] Upload plan: suppression ancien fichier echouee', {
                previousPath,
                error: error?.message || error
              });
            }
          }
        }
      }

      const floorplan = clientDataService.getFloorplan(name);

      // ✅ UTILISER wsHandler.broadcastRefresh()
      res.json(floorplan);
      console.log('[TRACE] Upload plan: refresh broadcast en cours');
      await wsHandler.broadcastRefresh();
      console.log('[TRACE] Upload plan: refresh broadcast terminé');

    } catch (error) {
      console.error('[ERROR] Erreur upload plan:', error);
      res.status(500).json({ error: 'Erreur lors de l\'upload du plan' });
    }
  });

  // Supprimer un plan
  app.delete('/api/floorplans/:floorplanId', async (req: Request, res: Response) => {
    try {
      const { floorplanId } = req.params;
      console.log('[TRACE] Suppression du plan:', floorplanId);
      
      const success = await clientDataService.deleteFloorplan(floorplanId);
      if (!success) {
        return res.status(404).json({ error: 'Plan non trouvé' });
      }

      // ✅ UTILISER wsHandler.broadcastRefresh()

      res.json({ success: true, message: 'Plan supprimé' });
      await wsHandler.broadcastRefresh();
    } catch (error) {
      console.error('[ERROR] Erreur suppression plan:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du plan' });
    }
  });

  // ===== OPTIONS DE MISE À JOUR DES POSITIONS =====

  // OPTION 1 : Mise à jour complète de l'arborescence (remplacer tout)
  app.put('/api/floorplans', async (req: Request, res: Response) => {
    try {
      const { floorplans } = req.body;
      
      if (!floorplans || typeof floorplans !== 'object') {
        return res.status(400).json({ 
          error: 'floorplans doit être un objet avec la structure complète' 
        });
      }

      console.log('[TRACE] Mise à jour complète de l\'arborescence des plans');

      // Mettre à jour chaque plan avec ses positions
      for (const [floorplanId, config] of Object.entries(floorplans)) {
        const positions = (config as any).positions || [];
        await clientDataService.setClientPositionsForFloorplan(floorplanId, positions);
      }

      // Retourner l'arborescence mise à jour
      const updatedFloorplans = clientDataService.getFloorplansHierarchy();
      res.json({ 
        success: true, 
        message: 'Arborescence mise à jour',
        floorplans: updatedFloorplans 
      });
            // ✅ UTILISER wsHandler.broadcastRefresh()
      await wsHandler.broadcastRefresh();

    } catch (error) {
      console.error('[ERROR] Erreur mise à jour complète:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour complète' });
    }
  });

  // OPTION 2A : Mise à jour unitaire - Remplacer toutes les positions d'un plan
  app.put('/api/floorplans/:floorplanId/positions', async (req: Request, res: Response) => {
    try {
      const { floorplanId } = req.params;
      const { positions } = req.body;

      if (!Array.isArray(positions)) {
        return res.status(400).json({ error: 'Les positions doivent être un tableau' });
      }

      console.log('[TRACE] Mise à jour des positions du plan:', floorplanId, '- Nombre de positions:', positions.length);

      const success = await clientDataService.setClientPositionsForFloorplan(floorplanId, positions);
      if (!success) {
        return res.status(404).json({ error: 'Plan non trouvé' });
      }


      res.json({ 
        success: true, 
        message: 'Positions mises à jour',
        floorplanId,
        positions 
      });
            // ✅ UTILISER wsHandler.broadcastRefresh()
      await wsHandler.broadcastRefresh();

    } catch (error) {
      console.error('[ERROR] Erreur mise à jour positions:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour des positions' });
    }
  });

 
  // ===== ROUTES UTILITAIRES =====

  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}