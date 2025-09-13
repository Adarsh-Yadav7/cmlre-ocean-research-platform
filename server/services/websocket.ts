import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface ConnectedClient {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
  lastPing: number;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: ConnectedClient = {
        ws,
        id: clientId,
        subscriptions: new Set(),
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);
      console.log(`WebSocket client connected: ${clientId} (${this.clients.size} total clients)`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        data: { 
          clientId,
          message: 'Connected to CMLRE Ocean Platform',
          timestamp: new Date().toISOString()
        }
      });

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(clientId, data);
        } catch (error) {
          console.error(`Error parsing message from client ${clientId}:`, error);
        }
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId} (${this.clients.size} total clients)`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    // Start heartbeat mechanism
    this.startHeartbeat();

    console.log('WebSocket server initialized on path /ws');
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.channels && Array.isArray(message.channels)) {
          message.channels.forEach((channel: string) => {
            client.subscriptions.add(channel);
          });
          this.sendToClient(clientId, {
            type: 'subscription_confirmed',
            data: { channels: Array.from(client.subscriptions) }
          });
        }
        break;

      case 'unsubscribe':
        if (message.channels && Array.isArray(message.channels)) {
          message.channels.forEach((channel: string) => {
            client.subscriptions.delete(channel);
          });
        }
        break;

      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        });
        break;

      case 'request_data':
        this.handleDataRequest(clientId, message.data);
        break;

      default:
        console.log(`Unknown message type from client ${clientId}:`, message.type);
    }
  }

  private handleDataRequest(clientId: string, request: any) {
    // Handle specific data requests from clients
    switch (request.type) {
      case 'environmental_latest':
        // This would normally fetch from database
        this.sendToClient(clientId, {
          type: 'environmental_data',
          data: {
            temperature: 23.4 + (Math.random() - 0.5) * 0.5,
            salinity: 35.2 + (Math.random() - 0.5) * 0.2,
            ph: 8.1 + (Math.random() - 0.5) * 0.1,
            dissolvedOxygen: 6.5 + (Math.random() - 0.5) * 0.5,
            chlorophyllA: 0.89 + (Math.random() - 0.5) * 0.1,
            timestamp: new Date().toISOString(),
            location: { lat: 12.9716, lng: 74.7965 }
          }
        });
        break;

      case 'vessel_position':
        this.sendToClient(clientId, {
          type: 'vessel_update',
          data: {
            vessel: 'FORV Sagar Sampada',
            position: { lat: 12.9716, lng: 74.7965 },
            depth: 2847,
            status: 'sampling',
            timestamp: new Date().toISOString()
          }
        });
        break;
    }
  }

  broadcast(type: string, data: any, channel?: string) {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Send to all clients or only those subscribed to specific channel
        if (!channel || client.subscriptions.has(channel) || client.subscriptions.has('all')) {
          try {
            client.ws.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            console.error(`Error sending message to client ${client.id}:`, error);
          }
        }
      }
    });

    console.log(`Broadcasted ${type} message to ${sentCount} clients${channel ? ` on channel ${channel}` : ''}`);
  }

  sendToClient(clientId: string, message: Partial<WebSocketMessage>) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    const fullMessage: WebSocketMessage = {
      type: message.type || 'unknown',
      data: message.data || {},
      timestamp: message.timestamp || new Date().toISOString()
    };

    try {
      client.ws.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      return false;
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client responded to last ping within 30 seconds
          if (now - client.lastPing > 30000) {
            console.log(`Client ${clientId} failed heartbeat check, disconnecting`);
            client.ws.terminate();
            this.clients.delete(clientId);
          } else {
            // Send ping
            client.ws.ping();
          }
        } else {
          this.clients.delete(clientId);
        }
      });
    }, 15000); // Heartbeat every 15 seconds
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  getClientSubscriptions(clientId: string): string[] {
    const client = this.clients.get(clientId);
    return client ? Array.from(client.subscriptions) : [];
  }

  // Broadcast specific types of data
  broadcastEnvironmentalData(data: any) {
    this.broadcast('environmental_data', data, 'environmental');
  }

  broadcastSpeciesIdentification(data: any) {
    this.broadcast('species_identification', data, 'species');
  }

  broadcastPrediction(data: any) {
    this.broadcast('prediction', data, 'predictions');
  }

  broadcastVesselUpdate(data: any) {
    this.broadcast('vessel_update', data, 'vessels');
  }

  broadcastAlert(data: any) {
    this.broadcast('alert', data, 'alerts');
  }

  broadcastSystemStatus(data: any) {
    this.broadcast('system_status', data, 'system');
  }

  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, 'Server shutting down');
      }
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.log('WebSocket service shut down');
  }
}

export const websocketService = new WebSocketService();
