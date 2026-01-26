// Types spécifiques au client
import { HAEntity } from './ha-types';

export type ObjectType = 
  | 'sensor'
  | 'light'
  | 'light-brightness'
  | 'cover-vertical'
  | 'cover-horizontal'
  | 'thermostat';

export interface FloorplanObject {
  entity_id: string;
  type: ObjectType;
  position: {
    x: number; // 0-1, proportion du plan
    y: number; // 0-1, proportion du plan
  };
  size?: {
    width: number;
    height: number;
  };
  config?: Record<string, any>;
}

export interface AppState {
  mode: 'normal' | 'parametrage';
  hasFloorplan: boolean;
  isFirstUpload: boolean;
  floorplan?: FloorplanConfig;
  objects: FloorplanObject[];
  availableEntities: HAEntity[];
  lastRefresh: number;
  isSaving: boolean;
  lastSaveTime: number;
  initialData?: any; // Données initiales reçues du serveur
}

export interface FloorplanConfig {
  path?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface PositionData {
  version: string;
  timestamp: number;
  objects: FloorplanObject[];
}

export interface WebSocketMessage {
  type: string;
  timestamp: number;
  data: any;
}
