import authService from './authService';

/**
 * SSE (Server-Sent Events) Realtime Service
 * Replaces WebSocket with HTTP-based Server-Sent Events for Vercel compatibility
 * 
 * SSE is one-way (server-to-client) and works perfectly with stateless serverless functions.
 * Server pushes events to connected clients via an open HTTP connection.
 */
class RealtimeService {
  constructor() {
    this.eventSource = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = {};
    this.isManualClose = false;
  }

  getSSEURL() {
    const isLocalBrowser =
      globalThis.window &&
      (globalThis.window.location.hostname === 'localhost' ||
        globalThis.window.location.hostname === '127.0.0.1');

    // SSE uses HTTP/HTTPS, not WS/WSS
    const baseURL = isLocalBrowser
      ? 'http://localhost:4000'
      : import.meta.env.VITE_API_BASE_URL || 'https://api.servpro.com';

    return baseURL;
  }

  connect() {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        const token = authService.getToken();
        if (!token) {
          reject(new Error('No authentication token available'));
          return;
        }

        // SSE endpoint uses GET with token parameter
        const sseURL = `${this.getSSEURL()}/realtime/subscribe?token=${token}`;
        this.eventSource = new EventSource(sseURL);

        this.eventSource.onopen = () => {
          console.log('SSE connected to realtime server');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        this.eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          this.eventSource.close();
          if (!this.isManualClose) {
            this.attemptReconnect();
          }
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  handleMessage(data) {
    const { type, payload } = data;
    
    // Skip internal messages
    if (type === 'ping' || type === 'connected' || type === 'pong') {
      console.debug(`SSE ping/pong: ${type}`);
      return;
    }
    
    // Emit event to all listeners
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in listener for ${type}:`, error);
        }
      });
    }

    // Also emit to 'all' listeners
    if (this.listeners['all']) {
      this.listeners['all'].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in global listener:', error);
        }
      });
    }
  }

  subscribe(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    this.listeners[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    };
  }

  unsubscribe(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    }
  }

  /**
   * SSE is one-way (server-to-client only)
   * For publishing events, use REST API endpoints instead
   */
  publish(type, payload) {
    console.warn('SSE is one-way (server-to-client). To send data to server, use REST API endpoints.');
  }

  disconnect() {
    this.isManualClose = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }

  // Convenience methods for specific event types
  onBookingUpdate(callback) {
    return this.subscribe('booking:update', callback);
  }

  onBookingCreated(callback) {
    return this.subscribe('booking:created', callback);
  }

  onStatusChange(callback) {
    return this.subscribe('status:change', callback);
  }

  onNotification(callback) {
    return this.subscribe('notification:new', callback);
  }

  onStats(callback) {
    return this.subscribe('stats:update', callback);
  }

  onLocationUpdate(callback) {
    return this.subscribe('location:update', callback);
  }
}

export default new RealtimeService();
