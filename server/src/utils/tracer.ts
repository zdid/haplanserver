// Simple UUID generator for CommonJS compatibility
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface TraceContext {
  traceId: string;
  parentId?: string;
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class Tracer {
  private static instance: Tracer;
  private traces: Map<string, TraceContext>;
  
  private constructor() {
    this.traces = new Map();
  }
  
  public static getInstance(): Tracer {
    if (!Tracer.instance) {
      Tracer.instance = new Tracer();
    }
    return Tracer.instance;
  }
  
  startTrace(operation: string, metadata?: Record<string, any>): TraceContext {
    const traceId = generateUUID();
    const context: TraceContext = {
      traceId,
      operation,
      timestamp: Date.now(),
      metadata
    };
    
    this.traces.set(traceId, context);
    this.logTrace(context, 'START');
    
    return context;
  }
  
  continueTrace(parentContext: TraceContext, operation: string, metadata?: Record<string, any>): TraceContext {
    const traceId = generateUUID();
    const context: TraceContext = {
      traceId,
      parentId: parentContext.traceId,
      operation,
      timestamp: Date.now(),
      metadata: {
        ...parentContext.metadata,
        ...metadata
      }
    };
    
    this.traces.set(traceId, context);
    this.logTrace(context, 'CONTINUE');
    
    return context;
  }
  
  endTrace(context: TraceContext, status: 'SUCCESS' | 'ERROR', result?: any, error?: any): void {
    const endTime = Date.now();
    const duration = endTime - context.timestamp;
    
    const traceData = {
      ...context,
      status,
      duration,
      result: status === 'SUCCESS' ? result : undefined,
      error: status === 'ERROR' ? error : undefined,
      endTimestamp: endTime
    };
    
    this.logTrace(traceData, 'END');
    this.traces.delete(context.traceId);
  }
  
  private logTrace(context: TraceContext | any, type: 'START' | 'CONTINUE' | 'END'): void {
    const logEntry: any = {
      traceType: type,
      traceId: context.traceId,
      parentId: context.parentId,
      operation: context.operation,
      timestamp: context.timestamp,
      ...(type === 'END' && { 
        duration: context.duration,
        status: context.status 
      })
    };
    
    if (context.metadata) {
      logEntry.metadata = context.metadata;
    }
    
    if (type === 'END' && context.error) {
      logEntry.error = context.error;
    }
    
    console.log(`[TRACE] [${type}]`, JSON.stringify(logEntry, null, 2));
  }
  
  getTrace(context: TraceContext): TraceContext | undefined {
    return this.traces.get(context.traceId);
  }
}

export default Tracer.getInstance();