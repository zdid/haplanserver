import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import ConfigManager from './core/config-manager';
import HAConnection from './core/ha-connection';
import HADataService from './services/ha-data-service';
import ClientDataService from './services/client-data-service';
import NotificationService from './services/notification-service';
import setupRoutes from './routes';
import logger from './utils/logger';
import { WebSocketHandler } from './websocket/WebSocketHandler';

async function main() {
  try {
    logger.info("Démarrage du serveur Home Assistant...");

    const configManager = new ConfigManager();
    const haConfig = configManager.getHAConnectionConfig();
    const serverConfig = configManager.getServerConfig();
    const notificationService = new NotificationService();

    logger.info("Configuration chargée:", {
      ha: configManager.getHAConfig(),
      server: serverConfig
    });

    const haConnection = new HAConnection(haConfig);
    await haConnection.connect();

    // ✅ Utiliser l'instance singleton (pas de new)
    const haDataService = new HADataService(haConnection.getConnection(), configManager);
    const clientDataService = new ClientDataService(configManager);
    
    // ✅ Enregistrer le service de notification singleton
    haDataService.setNotificationService(notificationService);
    
    await haDataService.initialize();
    await clientDataService.initialize();

    logger.info("Services initialisés avec succès");

    const app = express();
    const server = createServer(app);

    // Configuration CORS
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    // Servir les fichiers statiques du client
    const clientPath = path.resolve(path.join(__dirname, '../../client'));
    console.log('Serveur: Chemin des fichiers static :', clientPath);
    
    try {
      const stats = fs.statSync(clientPath);
      console.log('Serveur: Répertoire client trouvé:', stats.isDirectory());
    } catch (error: any) {
      console.error('Serveur: Répertoire client introuvable:', clientPath);
      console.error('Serveur: Erreur:', error.message);
    }
    
    app.use(express.static(clientPath));
     // ✅ AJOUTER les deux routes statiques
    const uploadPath = configManager.getFullUploadPath();
    console.log('Serveur: Chemin des uploads:', uploadPath);
    try {
      const uploadStats = fs.statSync(uploadPath);
      console.log('Serveur: Répertoire download trouvé:', uploadStats.isDirectory());
     
      let pathtemp = path.resolve(path.join(__dirname, '..','..','uploads'));
      console.log('Serveur: Chemin des uploads statiques :', pathtemp);
      app.use('/uploads', express.static(pathtemp));
      app.use('/download', express.static(uploadPath));
    } catch (error: any) {
      console.error('Serveur: Répertoire uploads introuvable:', uploadPath);
      console.error('Serveur: Erreur:', error.message);
    }
     
      
    // Route pour la racine
    app.get('/', (req, res) => {
      res.sendFile(path.join(clientPath, 'index.html'));
    });

    // Configuration WebSocket
    const wss = new WebSocketServer({ server });
    const wsHandler = new WebSocketHandler(haDataService, clientDataService, notificationService);

    wss.on('connection', (ws) => {
      logger.info("Nouveau client WebSocket connecté");
      
      // ✅ Utiliser l'instance singleton
      notificationService.addClient(ws);

      // ✅ Envoyer les données initiales
      wsHandler.sendInitialData(ws);

      ws.on('message', (message) => {
        try {
          wsHandler.handleMessage(ws, message.toString());
        } catch (error) {
          console.error('WebSocket: Erreur traitement', error);
        }
      });

      ws.on('close', () => {
        logger.info("Client WebSocket déconnecté");
        // ✅ Utiliser l'instance singleton
        notificationService.removeClient(ws);
      });

      ws.on('error', (error) => {
        logger.error("WebSocket erreur:", error);
      });
    });

    // Routes HTTP (upload, etc.)
    setupRoutes(app, haDataService, clientDataService, notificationService, wss, configManager, wsHandler);

    const port = serverConfig.server.port || 3000;
    const host = serverConfig.server.host || '0.0.0.0';
    
    server.listen(port, host, () => {
      logger.info(`Serveur démarré sur http://${host}:${port}`);
      logger.info(`Accessible via: http://localhost:${port}`);
    });

  } catch (error) {
    logger.error("Erreur fatale:", error);
    process.exit(1);
  }
}

main();
