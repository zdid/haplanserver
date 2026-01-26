export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface FloorplanUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

export interface EntityCommand {
  entity_id: string;
  service: string;
  service_data?: Record<string, any>;
}