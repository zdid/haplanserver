import logger from '../utils/logger';

interface TraceContext {
  traceId: string;
  parentId?: string;
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class HACommandService {
  private connection: any;
  
  constructor(connection: any) {
    this.connection = connection;
  }
  
  async executeCommand(
    entity_id: string, 
    service: string, 
    service_data: any = {},
    traceContext?: TraceContext
  ): Promise<any> {
   
    try {
      logger.info(`[TRACE] [] Exécution de la commande HA - Entity: ${entity_id}, Service: ${service}`);
      console.log(`[TRACE] [}] Données du service:`, service_data);

      // Préparer la commande pour Home Assistant
      const command = {
        type: 'call_service',
        domain: service.split('.')[0],
        service: service.split('.')[1],
        service_data: service_data,
        target: {
          entity_id: entity_id
        }
      };

      console.log(`[TRACE] Commande préparée:`, command);

      // Envoyer la commande à Home Assistant
      const startTime = Date.now();
      const result = await this.connection.sendMessagePromise(command);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`[TRACE] Réponse de HA reçue en ${duration}ms:`, result);


      return {
        success: true,
        result,
        duration
      };
      
    } catch (error: any) {
      console.error(`[TRACE] Erreur lors de l'exécution de la commande HA:`, error);
      throw {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          stack: error.stack
        }
      };
    }
  }
  
  async executeScript(script_id: string, variables: any = {}, traceContext?: TraceContext): Promise<any> {

    try {
      logger.info(`[TRACE] Exécution du script HA - Script: ${script_id}`);

      const command = {
        type: 'call_service',
        domain: 'script',
        service: script_id,
        service_data: variables
      };

      const startTime = Date.now();
      const result = await this.connection.sendMessagePromise(command);
      const duration = Date.now() - startTime;

      return {
        success: true,
        result,
        duration
      };
      
    } catch (error: any) {
      throw {
        success: false,
        error: error.message,
      };
    }
  }
}

export default HACommandService;