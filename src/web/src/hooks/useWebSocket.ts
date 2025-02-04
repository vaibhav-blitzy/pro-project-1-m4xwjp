/**
 * @fileoverview Custom React hook for managing WebSocket connections with enhanced features
 * including automatic reconnection, message queuing, and connection state management
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { WebSocketService } from '../services/websocket.service';

/**
 * Enum for WebSocket connection states
 */
enum ConnectionState {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Interface for WebSocket hook configuration options
 */
interface UseWebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxRetries?: number;
  connectionTimeout?: number;
  enableMessageQueue?: boolean;
  heartbeatInterval?: number;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

/**
 * Interface for WebSocket hook return value
 */
interface UseWebSocketReturn {
  connectionState: ConnectionState;
  error: Error | null;
  send: (channel: string, data: unknown) => Promise<void>;
  subscribe: <T>(channel: string, handler: (data: T) => void) => Promise<void>;
  unsubscribe: (channel: string) => void;
  reconnect: () => Promise<void>;
  isReconnecting: boolean;
  retryCount: number;
}

/**
 * Default options for WebSocket configuration
 */
const DEFAULT_OPTIONS: Required<UseWebSocketOptions> = {
  autoReconnect: true,
  reconnectInterval: 1000,
  maxRetries: 5,
  connectionTimeout: 5000,
  enableMessageQueue: true,
  heartbeatInterval: 30000,
  onConnectionStateChange: () => {},
  onError: () => {}
};

/**
 * Custom hook for managing WebSocket connections with enhanced reliability features
 * @param url - WebSocket server URL
 * @param options - Configuration options for the WebSocket connection
 * @returns WebSocket connection state and control methods
 */
export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  // Merge default options with provided options
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for persistent values
  const wsRef = useRef<WebSocketService | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Updates connection state and notifies through callback
   */
  const updateConnectionState = useCallback((newState: ConnectionState) => {
    setConnectionState(newState);
    config.onConnectionStateChange(newState);
  }, [config]);

  /**
   * Handles WebSocket errors
   */
  const handleError = useCallback((err: Error) => {
    setError(err);
    config.onError(err);
    updateConnectionState(ConnectionState.ERROR);
  }, [config, updateConnectionState]);

  /**
   * Initializes WebSocket connection
   */
  const initializeWebSocket = useCallback(async () => {
    try {
      if (wsRef.current) {
        await wsRef.current.disconnect();
      }

      updateConnectionState(ConnectionState.CONNECTING);

      const wsService = new WebSocketService({
        url,
        reconnectInterval: config.reconnectInterval,
        maxReconnectAttempts: config.maxRetries,
        connectionTimeout: config.connectionTimeout,
        debug: process.env.NODE_ENV === 'development'
      });

      await wsService.connect();
      wsRef.current = wsService;
      updateConnectionState(ConnectionState.CONNECTED);
      setError(null);
      setRetryCount(0);

      // Start heartbeat
      if (config.heartbeatInterval > 0) {
        heartbeatIntervalRef.current = setInterval(() => {
          wsService.send('heartbeat', { timestamp: Date.now() })
            .catch(handleError);
        }, config.heartbeatInterval);
      }

    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to initialize WebSocket'));
    }
  }, [url, config, updateConnectionState, handleError]);

  /**
   * Handles reconnection logic
   */
  const reconnect = useCallback(async () => {
    if (isReconnecting || retryCount >= config.maxRetries) return;

    setIsReconnecting(true);
    setRetryCount(prev => prev + 1);
    updateConnectionState(ConnectionState.RECONNECTING);

    try {
      await initializeWebSocket();
      setIsReconnecting(false);
    } catch (err) {
      if (retryCount < config.maxRetries && config.autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(
          reconnect,
          config.reconnectInterval * Math.pow(2, retryCount)
        );
      } else {
        setIsReconnecting(false);
        handleError(new Error('Max reconnection attempts reached'));
      }
    }
  }, [
    config,
    retryCount,
    isReconnecting,
    initializeWebSocket,
    handleError
  ]);

  /**
   * Sends data through WebSocket connection
   */
  const send = useCallback(async (channel: string, data: unknown): Promise<void> => {
    if (!wsRef.current) {
      throw new Error('WebSocket not initialized');
    }
    await wsRef.current.send(channel, data);
  }, []);

  /**
   * Subscribes to a WebSocket channel
   */
  const subscribe = useCallback(async <T>(
    channel: string,
    handler: (data: T) => void
  ): Promise<void> => {
    if (!wsRef.current) {
      throw new Error('WebSocket not initialized');
    }
    await wsRef.current.subscribe(channel, handler);
  }, []);

  /**
   * Unsubscribes from a WebSocket channel
   */
  const unsubscribe = useCallback((channel: string): void => {
    if (!wsRef.current) return;
    wsRef.current.unsubscribe?.(channel);
  }, []);

  // Initialize WebSocket connection on mount
  useEffect(() => {
    initializeWebSocket().catch(handleError);

    return () => {
      // Cleanup on unmount
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.disconnect().catch(console.error);
      }
    };
  }, [initializeWebSocket, handleError]);

  return {
    connectionState,
    error,
    send,
    subscribe,
    unsubscribe,
    reconnect,
    isReconnecting,
    retryCount
  };
}