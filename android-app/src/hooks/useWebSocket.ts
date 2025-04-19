import { useState, useEffect, useRef, useCallback } from 'react';

type WebSocketHookResult = {
  isConnected: boolean;
  send: (type: string, data: any) => void;
  lastMessage: any;
  connect: (url: string) => void;
  disconnect: () => void;
};

/**
 * Custom hook for WebSocket communication
 * @param autoConnect Auto connect to WebSocket on mount
 * @param url WebSocket URL to connect to
 * @returns WebSocket hook result object
 */
export default function useWebSocket(autoConnect = false, url?: string): WebSocketHookResult {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  // Cleanup function to clear socket and timers
  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);
  
  // Connect to WebSocket server
  const connect = useCallback((wsUrl: string) => {
    // Clean up existing socket if any
    cleanup();
    
    try {
      // Create new WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Handle connection open
      socket.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Send identify message on connect
        if (socket.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: 'identify',
            data: { userType: 'car' }
          });
          socket.send(message);
        }
      };
      
      // Handle messages
      socket.onmessage = (event) => {
        try {
          setLastMessage(event.data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
      
      // Handle connection close
      socket.onclose = (event) => {
        setIsConnected(false);
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
        
        // Attempt to reconnect if not a clean close
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
          reconnectAttemptsRef.current += 1;
          
          reconnectTimerRef.current = setTimeout(() => {
            connect(wsUrl);
          }, delay);
        }
      };
      
      // Handle errors
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [cleanup]);
  
  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
  }, [cleanup]);
  
  // Send message to WebSocket server
  const send = useCallback((type: string, data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, data });
      socketRef.current.send(message);
    } else {
      console.warn('WebSocket not connected, unable to send message');
    }
  }, []);
  
  // Connect on mount if autoConnect is true
  useEffect(() => {
    if (autoConnect && url) {
      connect(url);
    }
    
    // Clean up on unmount
    return () => {
      cleanup();
    };
  }, [autoConnect, url, connect, cleanup]);
  
  return {
    isConnected,
    send,
    lastMessage,
    connect,
    disconnect
  };
}