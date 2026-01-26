import { FloorplanObject } from '../types/client-types';

export class PositionCalculator {
  
  static toAbsolute(
    relative: { x: number; y: number },
    planSize: { width: number; height: number }
  ): { x: number; y: number } {
    return {
      x: relative.x * planSize.width,
      y: relative.y * planSize.height
    };
  }

  static toRelative(
    absolute: { x: number; y: number },
    planSize: { width: number; height: number }
  ): { x: number; y: number } {
    return {
      x: absolute.x / planSize.width,
      y: absolute.y / planSize.height
    };
  }

  static constrain(
    position: { x: number; y: number }
  ): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(1, position.x)),
      y: Math.max(0, Math.min(1, position.y))
    };
  }

  static centerObject(
    object: FloorplanObject,
    planSize: { width: number; height: number }
  ): { x: number; y: number } {
    const absolutePos = this.toAbsolute(object.position, planSize);
    return {
      x: absolutePos.x - (object.size?.width || 60) / 2,
      y: absolutePos.y - (object.size?.height || 60) / 2
    };
  }
}
