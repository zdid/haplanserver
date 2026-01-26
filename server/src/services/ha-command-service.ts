import Tracer from '../utils/tracer';
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
    // Créer ou continuer le contexte de trace
    const context = traceContext 
      ? Tracer.continueTrace(traceContext, 'HACommandService.executeCommand', {
          entity_id,
          service,
          service_data
        })
      : Tracer.startTrace('HACommandService.executeCommand', {
          entity_id,
          service,
          service_data
        });

    try {
      logger.info(`[TRACE] [${context.traceId}] Exécution de la commande HA - Entity: ${entity_id}, Service: ${service}`);
      console.log(`[TRACE] [${context.traceId}] Données du service:`, service_data);

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

      console.log(`[TRACE] [${context.traceId}] Commande préparée:`, command);

      // Envoyer la commande à Home Assistant
      const startTime = Date.now();
      const result = await this.connection.sendMessagePromise(command);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`[TRACE] [${context.traceId}] Réponse de HA reçue en ${duration}ms:`, result);

      // Terminer la trace avec succès
      Tracer.endTrace(context, 'SUCCESS', {
        result,
        duration
      });

      return {
        success: true,
        result,
        traceId: context.traceId,
        duration
      };
      
    } catch (error: any) {
      console.error(`[TRACE] [${context.traceId}] Erreur lors de l'exécution de la commande HA:`, error);

      // Terminer la trace avec erreur
      Tracer.endTrace(context, 'ERROR', null, {
        message: error.message,
        stack: error.stack,
        code: error.code
      });

      throw {
        success: false,
        error: error.message,
        traceId: context.traceId,
        details: {
          code: error.code,
          stack: error.stack
        }
      };
    }
  }
  
  async executeScript(script_id: string, variables: any = {}, traceContext?: TraceContext): Promise<any> {
    const context = traceContext 
      ? Tracer.continueTrace(traceContext, 'HACommandService.executeScript', {
          script_id,
          variables
        })
      : Tracer.startTrace('HACommandService.executeScript', {
          script_id,
          variables
        });

    try {
      logger.info(`[TRACE] [${context.traceId}] Exécution du script HA - Script: ${script_id}`);

      const command = {
        type: 'call_service',
        domain: 'script',
        service: script_id,
        service_data: variables
      };

      const startTime = Date.now();
      const result = await this.connection.sendMessagePromise(command);
      const duration = Date.now() - startTime;

      Tracer.endTrace(context, 'SUCCESS', { result, duration });

      return {
        success: true,
        result,
        traceId: context.traceId,
        duration
      };
      
    } catch (error: any) {
      Tracer.endTrace(context, 'ERROR', null, {
        message: error.message,
        stack: error.stack
      });

      throw {
        success: false,
        error: error.message,
        traceId: context.traceId
      };
    }
  }
}

export default HACommandService;