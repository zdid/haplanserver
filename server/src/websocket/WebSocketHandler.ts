import { WebSocket } from 'ws';
import HADataService from '../services/ha-data-service';
import ClientDataService from '../services/client-data-service';
import NotificationService from '../services/notification-service';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class WebSocketHandler {
  private haDataService: HADataService;
  private clientDataService: ClientDataService;
  private notificationService: NotificationService;

  constructor(
    haDataService: HADataService,
    clientDataService: ClientDataService,
    notificationService: NotificationService
  ) {
    this.haDataService = haDataService;
    this.clientDataService = clientDataService;
    this.notificationService = notificationService;
  }

  public async sendInitialData(ws: WebSocket): Promise<void> {
    const id = 'initial_' + uuidv4();
    await this.handleRefresh(ws, id);
  }

  public handleMessage(ws: WebSocket, message: string): void {
    try {
      const data = JSON.parse(message);

      const { id, action, payload } = data;

      if (!id || !action) {
        this.sendError(ws, 'invalid_request', 'id et action requis', 'Les champs id et action sont obligatoires');
        return;
      }

      switch (action) {
        case 'refresh':
          console.log(`Traitement de la commande refresh`);
          this.handleRefresh(ws, id);
          break;
        case 'command':
          this.handleCommand(ws, id, payload);
          break;
        case 'update_positions':
          this.handleUpdatePositions(ws, id, payload);
          break;
        case 'delete_floorplan':
          this.handleDeleteFloorplan(ws, id, payload);
          break;
        default:
          this.sendError(ws, 'unknown_action', `Action inconnue: ${action}`, `L'action '${action}' n'existe pas`);
          console.error(`Action inconnue reçue: ${action}`);
      }
    } catch (error: any) {
      this.sendError(ws, 'parse_error', 'Erreur de parsing du message', 'Impossible de parser le message JSON');
      console.error(`Erreur parsing:`, error);
    }
  }

  private sendError(ws: WebSocket, id: string, error: string, message: string): void {
    const response = {
      id,
      error,
      message
    };
    ws.send(JSON.stringify(response));
  }

  private async handleRefresh(ws: WebSocket, id: string): Promise<void> {
    try {
      const [tree, states] = await Promise.all([
        this.haDataService.getTree(),
        this.haDataService.getAllStates()
      ]);

      const plans = this.clientDataService.getFloorplansHierarchy();

      console.log('═══════════════════════════════════════════════════');
      console.log('[REFRESH] Envoi de la collection states');
      console.log('[REFRESH] Nombre de states:', Object.keys(states).length);
      console.log('[REFRESH] sensor.bibliotheque_barometre_temperature présent?', !!states['sensor.bibliotheque_barometre_temperature']);
      if (states['sensor.bibliotheque_barometre_temperature']) {
        console.log('[REFRESH] État de sensor.bibliotheque_barometre_temperature:', states['sensor.bibliotheque_barometre_temperature']);
      }
      console.log('═══════════════════════════════════════════════════');

      ws.send(JSON.stringify({
        type: 'refresh',
        id,
        data: { 
          tree, 
          states,
          plans
        }
      }));
      
      console.log(`Données refresh envoyées au client`); 
    } catch (error: any) {
      this.sendError(ws, id, 'refresh_error', error.message);
    }
  }

  public async broadcastRefresh(excludeWs?: WebSocket): Promise<void> {
    try {
      const [tree, states] = await Promise.all([
        this.haDataService.getTree(),
        this.haDataService.getAllStates()
      ]);

      const plans = this.clientDataService.getFloorplansHierarchy();

      console.log('═══════════════════════════════════════════════════');
      console.log('[BROADCAST_REFRESH] Envoi de la collection states');
      console.log('[BROADCAST_REFRESH] Nombre de states:', Object.keys(states).length);
      console.log('[BROADCAST_REFRESH] sensor.bibliotheque_barometre_temperature présent?', !!states['sensor.bibliotheque_barometre_temperature']);
      if (states['sensor.bibliotheque_barometre_temperature']) {
        console.log('[BROADCAST_REFRESH] État de sensor.bibliotheque_barometre_temperature:', states['sensor.bibliotheque_barometre_temperature']);
      }
      console.log('═══════════════════════════════════════════════════');

      let type = 'refresh';
      let data = { tree, states, plans };
      // Envoyer à tous les clients (sauf optionnellement l'émetteur)
      if (excludeWs) {
        this.notificationService.broadcastToAllExcept(type, data, excludeWs);
      } else {
        this.notificationService.broadcastToAll(type, data);
      }
      console.log('refresh broadcast envoyé à tous les clients');
    } catch (error: any) {
      console.error('Erreur lors du broadcast refresh:', error);
    }
  }

  private async handleCommand(ws: WebSocket, id: string, payload: any): Promise<void> {
    try {
      const { entity_id, service, service_data } = payload;

      if (!entity_id || !service) {
        this.sendError(ws, id, 'invalid_command', 'entity_id et service sont requis');
        return;
      }

      console.log(`Traitement de la commande: ${entity_id} -> ${service}`);

      await this.haDataService.executeCommand(entity_id, service, service_data);

      ws.send(JSON.stringify({
        type: 'command_response',
        id,
        success: true,
        message: `Commande exécutée avec succès pour ${entity_id}`
      }));

    } catch (error: any) {
      console.error(`Erreur lors de l'exécution de la commande:`, error);
      this.sendError(ws, id, 'command_error', error.message);
    }
  }

  private async handleUpdatePositions(ws: WebSocket, id: string, payload: any): Promise<void> {
    try {
      const { floorplanId, positions } = payload;

      console.log('═══════════════════════════════════════════════════');
      console.log('[UPDATE_POSITIONS] Requête reçue');
      console.log('[UPDATE_POSITIONS] id:', id);
      console.log('[UPDATE_POSITIONS] floorplanId:', floorplanId);
      console.log('[UPDATE_POSITIONS] positions count:', Array.isArray(positions) ? positions.length : 'non-array');
      if (Array.isArray(positions) && positions.length > 0) {
        console.log('[UPDATE_POSITIONS] first position:', positions[0]);
      }

      if (!floorplanId || !positions) {
        console.error('[UPDATE_POSITIONS] Données manquantes', { floorplanId, hasPositions: !!positions });
        console.log('═══════════════════════════════════════════════════');
        this.sendError(ws, id, 'invalid_positions', 'floorplanId et positions sont requis');
        return;
      }

      console.log(`Mise à jour des positions pour le plan: ${floorplanId}`);

      const success = await this.clientDataService.setClientPositionsForFloorplan(
        floorplanId,
        positions
      );

      if (!success) {
        console.error('[UPDATE_POSITIONS] Plan non trouvé:', floorplanId);
        console.log('═══════════════════════════════════════════════════');
        this.sendError(ws, id, 'update_positions_error', `Plan '${floorplanId}' non trouvé`);
        return;
      }

      console.log(`Positions mises à jour avec succès pour ${floorplanId}`);
      console.log('[UPDATE_POSITIONS] Broadcast refresh aux autres clients');
      console.log('═══════════════════════════════════════════════════');

      // PAS DE RÉPONSE - BROADCAST refresh À TOUS LES CLIENTS
      await this.broadcastRefresh(ws);

    } catch (error: any) {
      console.error(`Erreur lors de la mise à jour des positions:`, error);
      this.sendError(ws, id, 'update_positions_error', error.message);
    }
  }

  private async handleDeleteFloorplan(ws: WebSocket, id: string, payload: any): Promise<void> {
    try {
      const { floorplanId } = payload;

      if (!floorplanId) {
        this.sendError(ws, id, 'invalid_delete', 'floorplanId est requis');
        return;
      }

      console.log(`Suppression du plan: ${floorplanId}`);

      const success = await this.clientDataService.deleteFloorplan(floorplanId);

      if (!success) {
        this.sendError(ws, id, 'delete_floorplan_error', `Plan '${floorplanId}' non trouvé`);
        return;
      }

      console.log(`Plan supprimé avec succès: ${floorplanId}`);

      // PAS DE RÉPONSE - BROADCAST refresh À TOUS LES CLIENTS
      await this.broadcastRefresh();

    } catch (error: any) {
      console.error(`Erreur lors de la suppression du plan:`, error);
      this.sendError(ws, id, 'delete_floorplan_error', error.message);
    }
  }

 
}