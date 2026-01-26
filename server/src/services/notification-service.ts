import Tracer from '../utils/tracer';

interface TraceContext {
  traceId: string;
  parentId?: string;
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class NotificationService {
  private clients: Set<any>;

  constructor() {
    this.clients = new Set();
  }

  addClient(client: any): void {
    console.log('[TRACE] NotificationService: Nouveau client connecté - Total:', this.clients.size + 1);
    this.clients.add(client);
  }

  removeClient(client: any): void {
    console.log('[TRACE] NotificationService: Client déconnecté - Restants:', this.clients.size - 1);
    this.clients.delete(client);
  }

  broadcastUpdate(type: string, data: any, traceContext?: TraceContext): void {
    // Créer le message avec le bon format
    let message;
    if (type === 'state') {
      // Format spécifique pour les mises à jour de state
      message = JSON.stringify({
        type: "state_updated",
        payload: {
          entity_id: data.entity_id,
          new_state: data
        }
      });
    } else {
      // Format générique pour les autres types
      message = JSON.stringify({
        type: `update:${type}`,
        timestamp: Date.now(),
        data: data
      });
    }

    // Créer ou continuer une trace pour cette notification
    const context = traceContext 
      ? Tracer.continueTrace(traceContext, 'NotificationService.broadcastUpdate', {
          updateType: type,
          clientsCount: this.clients.size
        })
      : Tracer.startTrace('NotificationService.broadcastUpdate', {
          updateType: type,
          clientsCount: this.clients.size
        });

    console.log(`[TRACE] [${context.traceId}] NotificationService: Broadcast de ${type} à ${this.clients.size} clients`);
    console.log(`[TRACE] [${context.traceId}] Message formaté:`, message);
    
    let successfullySent = 0;
    let failedToSend = 0;
    
    this.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(message);
          successfullySent++;
          console.log(`[TRACE] [${context.traceId}] Message envoyé avec succès au client`);
        } catch (error) {
          failedToSend++;
          console.error(`[TRACE] [${context.traceId}] Échec de l'envoi au client:`, error);
        }
      } else {
        console.warn(`[TRACE] [${context.traceId}] Client non prêt (readyState: ${client.readyState})`);
        failedToSend++;
      }
    });
    
    // Terminer la trace avec le statut
    Tracer.endTrace(context, 'SUCCESS', {
      successfullySent,
      failedToSend,
      totalClients: this.clients.size
    });
    
    console.log(`[TRACE] [${context.traceId}] Notification propagée: ${successfullySent}/${this.clients.size} clients`);
  }
}

export default NotificationService;