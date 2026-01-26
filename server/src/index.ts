import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import ConfigManager from './core/config-manager';
import HAConnection from './core/ha-connection';
import HADataService from './services/ha-data-service';
import HACommandService from './services/ha-command-service';
import NotificationService from './services/notification-service';
import setupRoutes from './routes';
import logger from './utils/logger';
import Tracer from './utils/tracer';

// Fonction pour gérer les commandes WebSocket
async function handleWebSocketCommand(ws: any, data: any, haDataService: HADataService, notificationService: NotificationService, traceContext: any) {
  try {
    console.log(`[TRACE] [${traceContext.traceId}] Traitement de la commande command:`, data.payload);
        
    const { entity_id, service, service_data } = data.payload;
    
    if (!entity_id || !service) {
      const error = "entity_id et service sont requis";
      console.error(`[TRACE] [${traceContext.traceId}] Erreur: ${error}`);
      ws.send(JSON.stringify({
        type: 'command_response',
        id: data.id,
        success: false,
        error: error,
        traceId: traceContext.traceId
      }));
      Tracer.endTrace(traceContext, 'ERROR', null, { error });
      return;
    }
    
    // Créer le service de commande HA
    const haCommandService = new HACommandService(haDataService.getConnection());
    
    // Exécuter la commande avec traçage
    const haTrace = Tracer.continueTrace(traceContext, 'WebSocket.HACommandExecution', {
      entity_id,
      service
    });
    
    console.log(`[TRACE] [${haTrace.traceId}] Exécution de la commande HA...`);
    
    const result = await haCommandService.executeCommand(entity_id, service, service_data, haTrace);
    
    console.log(`[TRACE] [${haTrace.traceId}] Commande HA exécutée avec succès`);
    
    // Envoyer la réponse au client
    ws.send(JSON.stringify({
      type: 'command_response',
      id: data.id,
      success: true,
      result: result.result,
      traceId: traceContext.traceId,
      duration: result.duration
    }));
    
    Tracer.endTrace(traceContext, 'SUCCESS', {
      websocketResponse: 'Command executed successfully',
      totalDuration: result.duration
    });
    
  } catch (error: any) {
    console.error(`[TRACE] [${traceContext.traceId}] Erreur d'exécution de la commande:`, error);
    
    ws.send(JSON.stringify({
      type: 'command_response',
      id: data.id,
      success: false,
      error: error.error || 'Erreur inconnue',
      traceId: traceContext.traceId,
      details: error.details
    }));
    
    Tracer.endTrace(traceContext, 'ERROR', null, {
      message: error.message,
      stack: error.stack
    });
  }
}

// Fonction pour gérer les mises à jour de configuration WebSocket
async function handleWebSocketConfigUpdate(ws: any, data: any, configManager: ConfigManager, haDataService: HADataService, notificationService: NotificationService, traceContext: any) {
  try {
    console.log(`[TRACE] [${traceContext.traceId}] Mise à jour de configuration reçue`);
    
    if (!data.config) {
      const error = "Aucune configuration fournie";
      console.error(`[TRACE] [${traceContext.traceId}] Erreur: ${error}`);
      ws.send(JSON.stringify({
        type: 'config_response',
        id: data.id,
        success: false,
        error: error,
        traceId: traceContext.traceId
      }));
      Tracer.endTrace(traceContext, 'ERROR', null, { error });
      return;
    }
    
    // Sauvegarder la configuration
    configManager.savePositions(data.config);
    haDataService.setClientPositions(data.config);
    
    console.log(`[TRACE] [${traceContext.traceId}] Configuration sauvegardée avec succès`);
    
    // Notifier tous les clients via le service de notification
    notificationService.broadcastUpdate('config', data.config);
    
    // Envoyer la réponse au client
    ws.send(JSON.stringify({
      type: 'config_response',
      id: data.id,
      success: true,
      message: "Configuration sauvegardée",
      traceId: traceContext.traceId
    }));
    
    Tracer.endTrace(traceContext, 'SUCCESS', {
      configUpdate: 'Configuration saved and broadcasted'
    });
    
  } catch (error: any) {
    console.error(`[TRACE] [${traceContext.traceId}] Erreur de mise à jour de configuration:`, error);
    
    ws.send(JSON.stringify({
      type: 'config_response',
      id: data.id,
      success: false,
      error: error.message || 'Erreur inconnue',
      traceId: traceContext.traceId
    }));
    
    Tracer.endTrace(traceContext, 'ERROR', null, {
      message: error.message,
      stack: error.stack
    });
  }
}

async function main() {
  try {
    logger.info("Démarrage du serveur Home Assistant...");

    const configManager = new ConfigManager();
    const haConfig = configManager.getHAConnectionConfig();
    const serverConfig = configManager.getServerConfig();
    const clientPositions = configManager.getClientPositions();

    logger.info("Configuration chargée:", {
      ha: configManager.getHAConfig(),
      server: serverConfig,
      clientPositions: clientPositions
    });

    const haConnection = new HAConnection(haConfig);
    await haConnection.connect();

    const notificationService = new NotificationService();
    const haDataService = new HADataService(haConnection.getConnection(), configManager);
    haDataService.setNotificationService(notificationService);
    await haDataService.initialize();

    haDataService.setClientPositions(clientPositions)
    let plans = await haDataService.getAvailableFloorplans();
    if(plans.length > 1 ) {
      console.error(`Index : il y a ${plans.length } plans je prends le premier , ${plans[0]}` )
    }
    if(plans.length>0) {
      haDataService.setCurrentFloorplanPath('uploads/'+plans[0]);
    }

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
    const clientPath = path.join(__dirname, '../../client');
    console.log('[TRACE] Serveur: Chemin des fichiers statiques:', clientPath);
    
    // Vérifier que le chemin existe
    try {
      const stats = fs.statSync(clientPath);
      console.log('[TRACE] Serveur: Répertoire client trouvé:', stats.isDirectory());
    } catch (error: any ) {
      console.error('[TRACE] Serveur: Répertoire client introuvable:', clientPath);
      console.error('[TRACE] Serveur: Erreur:', error.message);
    }
    
    app.use(express.static(clientPath));
    
    // Servir les fichiers uploadés
    const uploadPath = configManager.getFullUploadPath();
    console.log('[TRACE] Serveur: Chemin des uploads:', uploadPath);
    
    try {
      const uploadStats = fs.statSync(uploadPath);
      console.log('[TRACE] Serveur: Répertoire uploads trouvé:', uploadStats.isDirectory());
      app.use('/uploads', express.static(uploadPath));
    } catch (error: any) {
      console.error('[TRACE] Serveur: Répertoire uploads introuvable:', uploadPath);
      console.error('[TRACE] Serveur: Erreur:', error.message);
    }

    // Route pour la racine
    app.get('/', (req, res) => {
      res.sendFile(path.join(clientPath, 'index.html'));
    });

    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      logger.info("Nouveau client WebSocket connecté");
      notificationService.addClient(ws);

      // Gestion des messages entrants
      ws.on('message', (message) => {
        try {
          console.log('[TRACE] WebSocket: Message reçu -', message.toString());
          
          // Analyser le message JSON
          const data = JSON.parse(message.toString());
          console.log('[TRACE] WebSocket: Message analysé -', JSON.stringify(data, null, 2));
          
          // Créer une trace pour ce message
          const traceContext = Tracer.startTrace('WebSocket.MessageReceived', {
            messageType: data.type,
            messageId: data.id || 'unknown',
            clientIp: (ws as any)._socket?.remoteAddress
          });
          
          console.log(`[TRACE] [${traceContext.traceId}] Message WebSocket reçu: ${data.type}`);
          
          // Traiter différents types de messages
          switch (data.type) {
            case 'command':
              handleWebSocketCommand(ws, data, haDataService, notificationService, traceContext);
              break;
            case 'config_update':
              handleWebSocketConfigUpdate(ws, data, configManager, haDataService, notificationService, traceContext);
              break;
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              Tracer.endTrace(traceContext, 'SUCCESS', { response: 'pong' });
              break;
            default:
              console.warn(`[TRACE] [${traceContext.traceId}] Type de message inconnu: ${data.type}`);
              Tracer.endTrace(traceContext, 'ERROR', null, { 
                message: 'Unknown message type',
                receivedType: data.type
              });
          }
          
        } catch (error) {
          console.error('[TRACE] WebSocket: Erreur de traitement du message:', error);
          logger.error("Erreur de traitement du message WebSocket:", error);
        }
      });

      ws.on('close', () => {
        logger.info("Client WebSocket déconnecté");
        notificationService.removeClient(ws);
      });
    });

    setupRoutes(app, haDataService, notificationService, wss, configManager);

    const port = serverConfig.server.port || 3000;
    const host = serverConfig.server.host || '0.0.0.0';
    
    server.listen(port, host, () => {
      logger.info(`Serveur démarré sur http://${host}:${port}`);
      logger.info(`Accessible via:`);
      logger.info(`- http://localhost:${port}`);
      //logger.info(`- http://${require('os').networkInterfaces().eth0[0].address}:${port}`);
    });

  } catch (error) {
    logger.error("Erreur fatale lors du démarrage:", error);
    process.exit(1);
  }
}

main();
