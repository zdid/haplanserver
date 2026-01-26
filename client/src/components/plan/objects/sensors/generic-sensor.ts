import { BaseSensor } from '../base/base-sensor';
import { SensorState, ObjectPosition, ObjectConfig } from '../../types/plan-types';
import { GenericSensorRenderer } from '../../renderers/sensor-renderers/generic-renderer';
import { DragDropService } from '../../services/drag-drop-service';
import { PositionService } from '../../services/position-service';
import { SensorRegistry } from './sensor-registry';

export class GenericSensor extends BaseSensor {
  public static sensorType: string = 'generic';
  public static priority: number = 0;

  public static canHandle(entity_id: string, state: SensorState): boolean {
    return true;
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

  protected createRenderer(): GenericSensorRenderer {
    return new GenericSensorRenderer(this.config);
  }
}

// Auto-enregistrement automatique
SensorRegistry.getInstance().registerSensorType(GenericSensor);
