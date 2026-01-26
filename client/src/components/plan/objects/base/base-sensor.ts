import { BaseObject } from './base-object';
import { SensorState, ObjectPosition, ObjectConfig, ObjectDimensions } from '../../types/plan-types';
import { DragDropService } from '../../services/drag-drop-service';
import { PositionService } from '../../services/position-service';
import { SensorRenderer } from '../../renderers/base/sensor-renderer';

export abstract class BaseSensor extends BaseObject {
  protected state: SensorState;
  protected renderer: SensorRenderer;

  constructor(
    entity_id: string,
    position: ObjectPosition,
    state: SensorState,
    config: ObjectConfig,
    dragDropService: DragDropService,
    positionService: PositionService,
    onPositionChange?: (entity_id: string, position: ObjectPosition) => void
  ) {
    super(entity_id, position, config, dragDropService, positionService, onPositionChange);
    this.state = state;
    this.renderer = this.createRenderer();
  }

  protected createElement(): HTMLElement {
    return this.renderer.createElement();
  }

  protected calculateDimensions(): ObjectDimensions {
    return this.renderer.getDimensions();
  }

  protected abstract createRenderer(): SensorRenderer;

  public updateState(state: SensorState): void {
    this.state = state;
    this.renderer.update(state, this.config);
    const newDimensions = this.renderer.getDimensions();
    if (newDimensions.width !== this.dimensions.width ||
        newDimensions.height !== this.dimensions.height) {
      this.dimensions = newDimensions;
      this.dragDropService.updateSensorDimensions(this.entity_id, newDimensions);
    }
  }
}
