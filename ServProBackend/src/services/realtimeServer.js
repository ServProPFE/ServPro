const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class RealtimeServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.subscriptions = new Map(); // Map of userId -> Set of event types
  }

  init() {
    // Create WebSocket server attached to HTTP server
    this.wss = new WebSocket.Server({ noServer: true });

    // Handle WebSocket upgrade requests
    this.server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const pathname = url.pathname;

      if (pathname === '/realtime') {
        this.handleUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });

    // WebSocket connection handler
    this.wss.on('connection', (ws, req) => {
      const userId = req.userId;
      console.log(`User ${userId} connected to realtime`);

      // Add client to map
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId).add(ws);

      // Handle incoming messages (subscribe/unsubscribe)
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, userId, message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        const clientSet = this.clients.get(userId);
        if (clientSet) {
          clientSet.delete(ws);
          if (clientSet.size === 0) {
            this.clients.delete(userId);
          }
        }
        console.log(`User ${userId} disconnected`);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('Realtime server initialized');
  }

  handleUpgrade(request, socket, head) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      request.userId = decoded.sub;

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('Token verification failed:', error.message);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  handleMessage(ws, userId, message) {
    const { type, payload } = message;

    switch (type) {
      case 'subscribe':
        this.subscribe(userId, payload.eventType);
        break;
      case 'unsubscribe':
        this.unsubscribe(userId, payload.eventType);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.log(`Unknown message type: ${type}`);
    }
  }

  subscribe(userId, eventType) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    this.subscriptions.get(userId).add(eventType);
  }

  unsubscribe(userId, eventType) {
    const subs = this.subscriptions.get(userId);
    if (subs) {
      subs.delete(eventType);
    }
  }

  // Broadcast event to all connected users (or specific userId if provided)
  broadcast(eventType, payload, userId = null) {
    const data = JSON.stringify({ type: eventType, payload });

    if (userId) {
      // Send to specific user
      const clientSet = this.clients.get(userId);
      if (clientSet) {
        clientSet.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });
      }
    } else {
      // Send to all connected clients
      this.clients.forEach((clientSet) => {
        clientSet.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });
      });
    }
  }

  // Send event only to users subscribed to that event type
  sendToSubscribed(eventType, payload) {
    const data = JSON.stringify({ type: eventType, payload });

    this.subscriptions.forEach((eventSet, userId) => {
      if (eventSet.has(eventType)) {
        const clientSet = this.clients.get(userId);
        if (clientSet) {
          clientSet.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data);
            }
          });
        }
      }
    });
  }

  // Helper method to get realtime server instance
  static getInstance(server) {
    if (!RealtimeServer.instance) {
      RealtimeServer.instance = new RealtimeServer(server);
    }
    return RealtimeServer.instance;
  }
}

module.exports = RealtimeServer;
