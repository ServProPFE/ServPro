import authService from './authService';

class RealtimeService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = {};
    this.isManualClose = false;
  }

  getWebSocketURL() {
    const isLocalBrowser =
      globalThis.window &&
      (globalThis.window.location.hostname === 'localhost' ||
        globalThis.window.location.hostname === '127.0.0.1');

    const baseURL = isLocalBrowser
      ? 'ws://localhost:4000'
      : import.meta.env.VITE_WS_BASE_URL || 'wss://api.servpro.com';

    return baseURL;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        const token = authService.getToken();
        if (!token) {
          reject(new Error('No authentication token available'));
          return;
        }

        const wsURL = `${this.getWebSocketURL()}/realtime?token=${token}`;
        this.ws = new WebSocket(wsURL);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          if (!this.isManualClose) {
            this.attemptReconnect();
          }
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

  publish(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
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
