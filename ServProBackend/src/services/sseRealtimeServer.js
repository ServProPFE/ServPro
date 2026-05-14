const jwt = require('jsonwebtoken');

class SSERealtimeServer {
  constructor() {
    this.clients = new Map(); // Map of userId -> Set of response objects
    this.subscriptions = new Map(); // Map of userId -> Set of event types
    this.messageQueue = new Map(); // Map of userId -> array of pending messages
  }

  /**
   * Authenticate and register a new SSE client connection
   * @param {string} token JWT token
   * @param {Response} res Express response object
   * @returns {string|null} userId if successful, null if auth fails
   */
  registerClient(token, res) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userId = decoded.sub;

      // Setup SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Store client connection
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(res);

      // Subscribe to all default event types
      if (!this.subscriptions.has(userId)) {
        this.subscriptions.set(userId, new Set());
      }
      this.subscriptions.get(userId).add('booking:created');
      this.subscriptions.get(userId).add('booking:update');
      this.subscriptions.get(userId).add('status:change');
      this.subscriptions.get(userId).add('notification:new');
      this.subscriptions.get(userId).add('stats:update');
      this.subscriptions.get(userId).add('location:update');

      // Send initial connection message
      this.sendToClient(res, {
        type: 'connected',
        message: 'Connected to realtime server',
        userId,
      });

      // Send keepalive ping every 30 seconds to prevent timeout
      const keepaliveInterval = setInterval(() => {
        this.sendToClient(res, {
          type: 'ping',
          timestamp: new Date().toISOString(),
        });
      }, 30000);

      // Handle client disconnect
      res.on('close', () => {
        clearInterval(keepaliveInterval);
        const clientSet = this.clients.get(userId);
        if (clientSet) {
          clientSet.delete(res);
          if (clientSet.size === 0) {
            this.clients.delete(userId);
          }
        }
        console.log(`User ${userId} disconnected from SSE`);
      });

      res.on('error', (error) => {
        clearInterval(keepaliveInterval);
        console.error('SSE error:', error);
      });

      console.log(`User ${userId} connected to SSE realtime`);
      return userId;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Send a message to a specific client
   * @param {Response} res Express response object
   * @param {Object} data Event data
   */
  sendToClient(res, data) {
    try {
      const eventStr = `data: ${JSON.stringify(data)}\n\n`;
      res.write(eventStr);
    } catch (error) {
      console.error('Error sending to client:', error);
    }
  }

  /**
   * Broadcast an event to a specific user's all connections
   * @param {string} userId Target user ID
   * @param {string} eventType Event type (e.g., 'booking:created')
   * @param {Object} payload Event payload
   */
  broadcastToUser(userId, eventType, payload) {
    const userConnections = this.clients.get(userId);
    if (!userConnections) {
      // Queue message for later delivery
      if (!this.messageQueue.has(userId)) {
        this.messageQueue.set(userId, []);
      }
      this.messageQueue.get(userId).push({ type: eventType, payload, timestamp: new Date().toISOString() });
      return;
    }

    const data = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    userConnections.forEach((res) => {
      this.sendToClient(res, data);
    });
  }

  /**
   * Broadcast an event to all connected users
   * @param {string} eventType Event type
   * @param {Object} payload Event payload
   */
  broadcastToAll(eventType, payload) {
    const data = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((userConnections) => {
      userConnections.forEach((res) => {
        this.sendToClient(res, data);
      });
    });
  }

  /**
   * Subscribe a user to a specific event type
   * @param {string} userId User ID
   * @param {string} eventType Event type to subscribe to
   */
  subscribe(userId, eventType) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    this.subscriptions.get(userId).add(eventType);
  }

  /**
   * Unsubscribe a user from a specific event type
   * @param {string} userId User ID
   * @param {string} eventType Event type to unsubscribe from
   */
  unsubscribe(userId, eventType) {
    const subs = this.subscriptions.get(userId);
    if (subs) {
      subs.delete(eventType);
    }
  }

  /**
   * Get queued messages for a user
   * @param {string} userId User ID
   * @returns {Array} Queued messages
   */
  getQueuedMessages(userId) {
    return this.messageQueue.get(userId) || [];
  }

  /**
   * Clear queued messages for a user
   * @param {string} userId User ID
   */
  clearQueuedMessages(userId) {
    this.messageQueue.delete(userId);
  }

  /**
   * Get connection count for monitoring
   * @returns {Object} Connection stats
   */
  getStats() {
    let totalConnections = 0;
    this.clients.forEach((connections) => {
      totalConnections += connections.size;
    });

    return {
      connectedUsers: this.clients.size,
      totalConnections,
      queuedUsers: this.messageQueue.size,
    };
  }
}

module.exports = new SSERealtimeServer();
