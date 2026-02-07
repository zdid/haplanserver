export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
}

export interface Area {
  area_id: string;
  name: string;
}

export interface Device {
  id: string;
  name: string;
  name_by_user: string | null;
  area_id: string | null;
}

export interface Entity {
  entity_id: string;
  device_id: string | null;
  name: string | null;
  platform: string;
}

export interface AreaNode {
  id: string;
  name: string;
  devices: DeviceNode[];
}

export interface DeviceNode {
  id: string;
  name: string;
  entities: EntityNode[];
}

export interface EntityNode {
  entity_id: string;
}

export type HATree = AreaNode[];