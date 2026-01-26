// Types pour les données Home Assistant

export interface HAEntity {
  entity_id: string;
  name: string;
  domain: string;
  device_id?: string;
  area_id?: string;
  visible?: boolean;
  attributes?: Record<string, any>;
}

export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HAArea {
  area_id: string;
  name: string;
  devices: HADevice[];
}

export interface HADevice {
  device_id: string;
  name: string;
  entities: HAEntity[];
}

export interface HAConfig {
  [key: string]: any;
}

export interface FloorplanConfig {
  path?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface InitialData {
  tree: HAArea[];
  states: HAState[];
  config: HAConfig;
  floorplan?: FloorplanConfig;
}

export interface HACommand {
  entity_id: string;
  service: string;
  data?: Record<string, any>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
