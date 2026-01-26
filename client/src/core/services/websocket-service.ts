import { WebSocketMessage } from '../types/client-types';
import { HAState } from '../types/ha-types';

export class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private onConnectHandlers: (() => void)[] = [];
  private onDisconnectHandlers: (() => void)[] = [];

  constructor(url: string = 'ws://localhost:3000') {
    this.url = url;
  }

  connect(): void {
    this.socket = new WebSocket(this.url);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('WebSocket connected');
      this.onConnectHandlers.forEach(handler => handler());
    };

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.onDisconnectHandlers.forEach(handler => handler());
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    } else {
      console.warn(`No handler for message type: ${message.type}`);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  onMessage(type: string, handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  onConnect(handler: () => void): void {
    this.onConnectHandlers.push(handler);
  }

  onDisconnect(handler: () => void): void {
    this.onDisconnectHandlers.push(handler);
  }

  sendMessage(type: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        timestamp: Date.now(),
        data
      };
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
