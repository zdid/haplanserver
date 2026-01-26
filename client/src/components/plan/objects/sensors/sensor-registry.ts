import { BaseSensor } from '../base/base-sensor';
import { SensorState, ObjectPosition, ObjectConfig } from '../../types/plan-types';
import { DragDropService } from '../../services/drag-drop-service';
import { PositionService } from '../../services/position-service';

interface SensorConstructor {
  new (
    entity_id: string,
    position: ObjectPosition,
    state: SensorState,
    config: ObjectConfig,
    dragDropService: DragDropService,
    positionService: PositionService,
    onPositionChange?: (entity_id: string, position: ObjectPosition) => void
  ): BaseSensor;

  sensorType: string;
  priority: number;
  canHandle?(entity_id: string, state: SensorState): boolean;
}

export class SensorRegistry {
  private static instance: SensorRegistry;
  private sensorConstructors: Map<string, SensorConstructor> = new Map();
  private sensorHandlers: Array<{constructor: SensorConstructor, priority: number}> = [];

  private constructor() {}

  public static getInstance(): SensorRegistry {
    if (!SensorRegistry.instance) {
      SensorRegistry.instance = new SensorRegistry();
    }
    return SensorRegistry.instance;
  }

  public registerSensorType(constructor: SensorConstructor): void {
    if (!constructor.sensorType) {
      console.error(`Sensor type not defined for ${constructor.name}`);
      return;
    }

    this.sensorConstructors.set(constructor.sensorType, constructor);
    this.sensorHandlers.push({
      constructor,
      priority: constructor.priority || 0
    });

    this.sensorHandlers.sort((a, b) => b.priority - a.priority);
    console.log(`[SensorRegistry] Registered sensor type: ${constructor.sensorType}`);
  }

  public createSensor(
    entity_id: string,
    position: ObjectPosition,
    state: SensorState,
    config: ObjectConfig,
    dragDropService: DragDropService,
    positionService: PositionService,
    onPositionChange?: (entity_id: string, position: ObjectPosition) => void
  ): BaseSensor {
    for (const handler of this.sensorHandlers) {
      if (handler.constructor.canHandle &&
          handler.constructor.canHandle(entity_id, state)) {
        return new handler.constructor(
          entity_id, position, state, config,
          dragDropService, positionService, onPositionChange
        );
      }
    }

    const sensorType = this.determineSensorType(entity_id, state);
    const constructor = this.sensorConstructors.get(sensorType);

    if (constructor) {
      return new constructor(
        entity_id, position, state, config,
        dragDropService, positionService, onPositionChange
      );
    }

    console.warn(`[SensorRegistry] No specific sensor type found for ${entity_id}, using generic sensor`);
    const genericConstructor = this.sensorConstructors.get('generic');
    if (genericConstructor) {
      return new genericConstructor(
        entity_id, position, state, config,
        dragDropService, positionService, onPositionChange
      );
    }

    throw new Error(`No sensor constructor available for ${entity_id}`);
  }

  private determineSensorType(entity_id: string, state: SensorState): string {
    if (entity_id.startsWith('sensor.temperature') ||
        state.attributes?.unit_of_measurement === '°C' ||
        state.attributes?.unit_of_measurement === '°F') {
      return 'temperature';
    } else if (entity_id.startsWith('sensor.humidity') ||
               state.attributes?.unit_of_measurement === '%') {
      return 'humidity';
    } else if (entity_id.startsWith('binary_sensor.')) {
      return 'binary';
    } else {
      return 'generic';
    }
  }

  public getRegisteredSensorTypes(): string[] {
    return Array.from(this.sensorConstructors.keys());
  }
}
