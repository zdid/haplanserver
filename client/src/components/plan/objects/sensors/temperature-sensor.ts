import { BaseSensor } from '../base/base-sensor';
import { SensorState, ObjectPosition, ObjectConfig } from '../../types/plan-types';
import { TemperatureSensorRenderer } from '../../renderers/sensor-renderers/temperature-renderer';
import { DragDropService } from '../../services/drag-drop-service';
import { PositionService } from '../../services/position-service';
import { SensorRegistry } from './sensor-registry';

export class TemperatureSensor extends BaseSensor {
  public static sensorType: string = 'temperature';
  public static priority: number = 10;

  public static canHandle(entity_id: string, state: SensorState): boolean {
    return entity_id.startsWith('sensor.temperature') ||
           state.attributes?.unit_of_measurement === '°C' ||
           state.attributes?.unit_of_measurement === '°F';
  }

  constructor(
    entity_id: string,
    position: ObjectPosition,
    state: SensorState,
    config: ObjectConfig,
    dragDropService: DragDropService,
    positionService: PositionService,
    onPositionChange?: (entity_id: string, position: ObjectPosition) => void
  ) {
    super(entity_id, position, state, config, dragDropService, positionService, onPositionChange);
  }

  protected createRenderer(): TemperatureSensorRenderer {
    return new TemperatureSensorRenderer(this.config);
  }
}

// Auto-enregistrement automatique
SensorRegistry.getInstance().registerSensorType(TemperatureSensor);
