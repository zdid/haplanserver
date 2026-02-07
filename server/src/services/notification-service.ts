import { WebSocket } from 'ws';

export default class NotificationService {
    private clients: Set<WebSocket> = new Set();

  public addClient(ws: WebSocket): void {
    console.log('[NotificationService] Client connecté');
    this.clients.add(ws);
    
    // ✅ Écouter la fermeture de la connexion
    ws.on('close', () => {
      console.log('[NotificationService] Client déconnecté');
      this.clients.delete(ws);
    });

    // ✅ Écouter les erreurs
    ws.on('error', (error) => {
      console.error('[NotificationService] Erreur WebSocket:', error);
      this.clients.delete(ws);
    });
  }
  public removeClient(ws: WebSocket): void {
    if(this.clients.has(ws)) {
      this.clients.delete(ws);
      console.log('[NotificationService] Client supprimé');
    } else {
      console.log('[NotificationService] Tentative de suppression d\'un client non existant');
    }
  }

  public broadcastToAll(type: string, data: any): void {
    // 💡 Trace spéciale pour light.bureau_plafonnier
    if (type === 'state' && data.entity_id === 'light.bureau_plafonnier') {
      console.log(`💡 [NotificationService] broadcastToAll pour ${data.entity_id}`, {
        type,
        state: data.state,
        clients: this.clients.size
      });
    } else if(type !== 'state' && type !== 'refresh') {
      console.log(`[NotificationService] Broadcast à ${this.clients.size} clients`,type, data);
    }
    
    const message = JSON.stringify({ type, data });
    this.clients.forEach((client) => {
      // ✅ Vérifier que le client est connecté avant d'envoyer
      if (client.readyState === 1) {  // 1 = OPEN
        try {
          client.send(message);
          
          // 💡 Trace spéciale pour light.bureau_plafonnier
          if (type === 'state' && data.entity_id === 'light.bureau_plafonnier') {
            console.log(`✉️ [NotificationService] Message envoyé au client pour ${data.entity_id}`);
          }
        } catch (error) {
          console.error('[NotificationService] Erreur lors de l\'envoi:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  public broadcastToAllExcept(type: string, data: any, excludedClient?: WebSocket): void {
    const message = JSON.stringify({ type, data });
    this.clients.forEach((client) => {
      if (excludedClient && client === excludedClient) {
        return;
      }

      if (client.readyState === 1) {
        try {
          client.send(message);
        } catch (error) {
          console.error('[NotificationService] Erreur lors de l\'envoi:', error);
          this.clients.delete(client);
        }
      }
    });
  }
  
  public getClientCount(): number {
    return this.clients.size;
  }

  public closeAll(): void {
    console.log('[NotificationService] Fermeture de tous les clients');
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();
  }
}