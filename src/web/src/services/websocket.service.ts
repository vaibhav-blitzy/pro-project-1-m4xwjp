/**
 * @fileoverview Enhanced WebSocket service for real-time communication with comprehensive
 * security, performance optimization, and reliability features
 * @version 1.0.0
 */

import ReconnectingWebSocket from 'reconnecting-websocket'; // v4.4.0
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { APP_CONFIG } from '../constants/app.constants';

// WebSocket message interface
interface WebSocketMessage {
  channel: string;
  type: string;
  data: unknown;
  timestamp: number;
}

// Connection configuration interface
interface ConnectionConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  connectionTimeout: number;
  debug: boolean;
}

// Message handler type
type MessageHandler = (data: unknown) => void;

// Pending message interface for offline queue
interface PendingMessage {
  channel: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

// Message queue implementation
class Queue<T> {
  private items: T[] = [];
  private readonly maxSize: number = 1000;

  enqueue(item: T): void {
    if (this.items.length >= this.maxSize) {
      this.items.shift();
    }
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  clear(): void {
    this.items = [];
  }

  get size(): number {
    return this.items.length;
  }
}

/**
 * Enhanced WebSocket service implementing secure real-time communication
 * with comprehensive error handling and reconnection strategies
 */
export class WebSocketService {
  private socket: ReconnectingWebSocket | null = null;
  private readonly authService: AuthService;
  private readonly storageService: StorageService;
  private readonly eventListeners: Map<string, Set<MessageHandler>>;
  private readonly messageQueue: Queue<PendingMessage>;
  private readonly config: ConnectionConfig;
  private reconnectAttempts: number = 0;
  private isConnected: boolean = false;
  private readonly storageKey = `${APP_CONFIG.APP_NAME}_ws_state`;

  constructor(config: ConnectionConfig) {
    this.config = {
      ...config,
      reconnectInterval: config.reconnectInterval || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      connectionTimeout: config.connectionTimeout || 5000,
      debug: config.debug || false
    };

    this.authService = new AuthService();
    this.storageService = new StorageService();
    this.eventListeners = new Map();
    this.messageQueue = new Queue<PendingMessage>();

    // Restore connection state if available
    this.restoreState();
  }

  /**
   * Establishes WebSocket connection with authentication and error handling
   */
  public async connect(): Promise<void> {
    try {
      const token = await this.authService.getTokens();
      if (!token) {
        throw new Error('Authentication required');
      }

      this.socket = new ReconnectingWebSocket(
        `${this.config.url}?token=${token.accessToken}`,
        [],
        {
          maxRetries: this.config.maxReconnectAttempts,
          reconnectionDelayGrowFactor: 1.5,
          maxReconnectionDelay: 5000,
          minReconnectionDelay: this.config.reconnectInterval
        }
      );

      this.setupEventHandlers();
      this.setupConnectionTimeout();

      await this.waitForConnection();
      this.processMessageQueue();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      throw error;
    }
  }

  /**
   * Gracefully disconnects WebSocket connection with cleanup
   */
  public async disconnect(): Promise<void> {
    if (!this.socket) return;

    try {
      this.saveState();
      this.eventListeners.clear();
      this.socket.close(1000, 'Client disconnecting');
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('WebSocket disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Subscribes to a channel with type-safe message handling
   */
  public async subscribe<T>(channel: string, handler: MessageHandler): Promise<void> {
    if (!channel || typeof handler !== 'function') {
      throw new Error('Invalid subscription parameters');
    }

    if (!this.eventListeners.has(channel)) {
      this.eventListeners.set(channel, new Set());
    }

    this.eventListeners.get(channel)?.add(handler);

    if (this.isConnected) {
      await this.send('subscribe', { channel });
    }
  }

  /**
   * Sends message with queuing for offline support
   */
  public async send(channel: string, data: unknown): Promise<void> {
    const message: WebSocketMessage = {
      channel,
      type: 'message',
      data,
      timestamp: Date.now()
    };

    if (!this.isConnected) {
      this.messageQueue.enqueue({
        channel,
        data,
        timestamp: Date.now(),
        retryCount: 0
      });
      return;
    }

    try {
      if (!this.socket) throw new Error('WebSocket not connected');
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.addEventListener('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.config.debug) {
        console.log('WebSocket connected');
      }
    });

    this.socket.addEventListener('close', (event) => {
      this.isConnected = false;
      if (this.config.debug) {
        console.log('WebSocket closed:', event.code, event.reason);
      }
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        const handlers = this.eventListeners.get(message.channel);
        
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.data);
            } catch (error) {
              console.error('Message handler error:', error);
            }
          });
        }
      } catch (error) {
        console.error('Message processing error:', error);
      }
    });

    this.socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.reconnectAttempts++;
    });
  }

  private setupConnectionTimeout(): void {
    setTimeout(() => {
      if (!this.isConnected && this.socket) {
        this.socket.close(4000, 'Connection timeout');
      }
    }, this.config.connectionTimeout);
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });

      this.socket.addEventListener('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      }, { once: true });
    });
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.size > 0 && this.isConnected) {
      const message = this.messageQueue.dequeue();
      if (message) {
        try {
          await this.send(message.channel, message.data);
        } catch (error) {
          console.error('Failed to process queued message:', error);
          if (message.retryCount < 3) {
            message.retryCount++;
            this.messageQueue.enqueue(message);
          }
        }
      }
    }
  }

  private async saveState(): Promise<void> {
    const state = {
      eventChannels: Array.from(this.eventListeners.keys()),
      queueSize: this.messageQueue.size,
      timestamp: Date.now()
    };
    await this.storageService.setItem(this.storageKey, state);
  }

  private async restoreState(): Promise<void> {
    const state = await this.storageService.getItem(this.storageKey);
    if (state && Date.now() - state.timestamp < 3600000) { // 1 hour validity
      state.eventChannels.forEach(channel => {
        this.eventListeners.set(channel, new Set());
      });
    }
  }
}