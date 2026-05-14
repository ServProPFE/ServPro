const express = require('express');
const router = express.Router();
const sseRealtimeServer = require('../services/sseRealtimeServer');
const authMiddleware = require('../middleware/auth');

/**
 * SSE endpoint for realtime events
 * Client connects with GET /realtime/subscribe?token=JWT_TOKEN
 * Receives Server-Sent Events in the format:
 * data: {"type":"event_type","payload":{...},"timestamp":"..."}
 */
router.get('/subscribe', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  const userId = sseRealtimeServer.registerClient(token, res);

  if (!userId) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  // Send any queued messages from while client was disconnected
  const queuedMessages = sseRealtimeServer.getQueuedMessages(userId);
  if (queuedMessages.length > 0) {
    queuedMessages.forEach((msg) => {
      sseRealtimeServer.sendToClient(res, {
        type: msg.type,
        payload: msg.payload,
        timestamp: msg.timestamp,
        queued: true,
      });
    });
    sseRealtimeServer.clearQueuedMessages(userId);
  }
});

/**
 * Test endpoint to get realtime server stats
 */
router.get('/stats', (req, res) => {
  const stats = sseRealtimeServer.getStats();
  return res.json(stats);
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    service: 'SSE Realtime Server',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
