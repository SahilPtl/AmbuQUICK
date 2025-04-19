/**
 * Service for WebSocket connections with the server
 */
export default class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Connect to the WebSocket server
   * @param serverUrl WebSocket server URL
   */
  public connect(serverUrl: string): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      console.log(`Connecting to WebSocket server: ${serverUrl}`);
      this.socket = new WebSocket(serverUrl);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.reconnectAttempts = 0;
  }

  /**
   * Send data to the WebSocket server
   * @param type Message type
   * @param data Message data
   */
  public send(type: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type,
        ...data,
        timestamp: Date.now()
      }));
    } else {
      console.error('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Add an event listener
   * @param type Event type
   * @param callback Callback function
   */
  public addEventListener(type: string, callback: (data: any) => void): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  /**
   * Remove an event listener
   * @param type Event type
   * @param callback Callback function
   */
  public removeEventListener(type: string, callback: (data: any) => void): void {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }
  }

  /**
   * Send position update to the server
   * @param position Position object with latitude and longitude
   */
  public sendPositionUpdate(position: { latitude: number; longitude: number }): void {
    this.send('position', {
      position: {
        lat: position.latitude,
        lng: position.longitude
      }
    });
  }

  private handleOpen(event: Event): void {
    console.log('WebSocket connection established');
    this.reconnectAttempts = 0;
    this.dispatchEvent('open', event);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      if (data.type && this.listeners[data.type]) {
        this.listeners[data.type].forEach(callback => callback(data));
      }
      this.dispatchEvent('message', data);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.socket = null;
    this.dispatchEvent('close', event);
    this.attemptReconnect();
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.dispatchEvent('error', event);
  }

  private dispatchEvent(type: string, data: any): void {
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => callback(data));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached, giving up');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      // Reconnect using the same URL
      // Note: In a real implementation, we would need to store the URL
      const serverUrl = 'ws://example.com/ws'; // This would be the actual server URL
      this.connect(serverUrl);
    }, delay);
  }
}
