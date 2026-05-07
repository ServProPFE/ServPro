import { useEffect, useCallback, useRef } from 'react';
import realtimeService from '../services/realtimeService';

export const useRealtime = () => {
  const unsubscribeRef = useRef([]);

  const subscribe = useCallback((eventType, callback) => {
    const unsubscribe = realtimeService.subscribe(eventType, callback);
    unsubscribeRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  const connect = useCallback(() => {
    return realtimeService.connect();
  }, []);

  const disconnect = useCallback(() => {
    realtimeService.disconnect();
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      unsubscribeRef.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, []);

  return {
    subscribe,
    connect,
    disconnect,
    isConnected: () => realtimeService.isConnected(),
    publish: (type, payload) => realtimeService.publish(type, payload),
    onBookingUpdate: (callback) => subscribe('booking:update', callback),
    onBookingCreated: (callback) => subscribe('booking:created', callback),
    onStatusChange: (callback) => subscribe('status:change', callback),
    onNotification: (callback) => subscribe('notification:new', callback),
    onStats: (callback) => subscribe('stats:update', callback),
    onLocationUpdate: (callback) => subscribe('location:update', callback),
  };
};

export default useRealtime;
