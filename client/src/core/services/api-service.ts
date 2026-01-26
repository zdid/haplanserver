import { APIResponse, HACommand, InitialData } from '../types/ha-types';
import { FloorplanConfig, PositionData } from '../types/client-types';

export class APIService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async getInitialData(): Promise<InitialData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/data`);
      const data: APIResponse<InitialData> = await response.json();
      
      // Afficher les 1000 premiers caractères de la réponse
      const responsePreview = JSON.stringify(data).substring(0, 1000);
      console.log('API /api/data response preview:', responsePreview);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch initial data');
      }
      
      return data.data!;
    } catch (error) {
      console.error('API Service - getInitialData:', error);
      throw error;
    }
  }

  async refreshData(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/data`);
      const data: APIResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to refresh data');
      }
    } catch (error) {
      console.error('API Service - refreshData:', error);
      throw error;
    }
  }

  async uploadFloorplan(file: File): Promise<FloorplanConfig> {
    try {
      const formData = new FormData();
      formData.append('floorplan', file);

      console.log('API Service: Uploading floorplan', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      const response = await fetch(`${this.baseUrl}/api/floorplan/upload`, {
        method: 'POST',
        body: formData
      });

      const responseText = await response.text();
      console.log('API Service: Raw upload response:', responseText);
      
      let data: APIResponse<FloorplanConfig>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('API Service: Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (!data.success) {
        console.error('API Service: Upload failed', data);
        throw new Error(data.error || 'Failed to upload floorplan');
      }
      
      // Vérifier et corriger le chemin si nécessaire
      if (data.data && data.data.path) {
        if (!data.data.path.startsWith('http')) {
          // Si le chemin est relatif, le rendre absolu
          data.data.path = `${this.baseUrl}/${data.data.path}`;
          console.log('API Service: Corrected relative path to absolute:', data.data.path);
        }
      }
      
      console.log('API Service: Upload successful', data.data);
      return data.data!;
    } catch (error) {
      console.error('API Service - uploadFloorplan:', error);
      throw error;
    }
  }

  async savePositions(positions: PositionData): Promise<void> {
    console.log('[TRACE] APIService: Début sauvegarde positions');
    
    try {
      console.log('[TRACE] APIService: Appel API avec:', positions);
      
      const response = await fetch(`${this.baseUrl}/api/config/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(positions)
      });

      const data: APIResponse = await response.json();
      
      console.log('[TRACE] APIService: Réponse serveur:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save positions');
      }
      
      console.log('[TRACE] APIService: Sauvegarde réussie');
    } catch (error) {
      console.error('[TRACE] APIService: Échec sauvegarde:', error);
      throw error;
    }
  }

  async sendCommand(command: HACommand): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/entities/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
      });

      const data: APIResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send command');
      }
    } catch (error) {
      console.error('API Service - sendCommand:', error);
      throw error;
    }
  }
}
