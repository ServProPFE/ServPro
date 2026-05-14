/**
 * Realtime Event Emitter
 * Central place to broadcast SSE events from anywhere in the backend
 * 
 * Usage:
 *   const { broadcastToUser, broadcastToAll } = require('./utils/realtimeEmitter');
 *   
 *   // Send event to specific user
 *   broadcastToUser(userId, 'booking:created', { bookingId: 123, ... });
 *   
 *   // Broadcast to all users
 *   broadcastToAll('stats:update', { totalBookings: 500, ... });
 */

const sseRealtimeServer = require('../services/sseRealtimeServer');

const broadcastToUser = (userId, eventType, payload) => {
  try {
    sseRealtimeServer.broadcastToUser(userId, eventType, payload);
    console.log(`[SSE] Broadcast to user ${userId}: ${eventType}`);
  } catch (error) {
    console.error(`[SSE] Error broadcasting to user ${userId}:`, error);
  }
};

const broadcastToAll = (eventType, payload) => {
  try {
    sseRealtimeServer.broadcastToAll(eventType, payload);
    console.log(`[SSE] Broadcast to all users: ${eventType}`);
  } catch (error) {
    console.error(`[SSE] Error broadcasting to all:`, error);
  }
};

module.exports = {
  broadcastToUser,
  broadcastToAll,
};
