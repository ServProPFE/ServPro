import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useRealtime from '../hooks/useRealtime';
import authService from '../services/authService';

const RealtimeContext = createContext();

export const RealtimeProvider = ({ children }) => {
  const realtime = useRealtime();
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [latestBooking, setLatestBooking] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    let storageListener;
    let isMounted = true;

    const startSubscriptions = () => {
      // Subscribe to various events
      realtime.onStats((data) => {
        setStats(data);
      });

      realtime.onBookingCreated((data) => {
        setLatestBooking(data);
      });

      realtime.onBookingUpdate((data) => {
        setLatestBooking(data);
      });

      realtime.onNotification((data) => {
        setNotification(data);
      });
    };

    const connectIfAuthenticated = async () => {
      const token = authService.getToken();
      if (!token) {
        // No token yet; wait for storage event or manual login
        setIsConnected(false);
        return;
      }

      try {
        await realtime.connect();
        if (!isMounted) return;
        setIsConnected(true);
        startSubscriptions();
      } catch (error) {
        console.error('Failed to connect to realtime service:', error);
        setIsConnected(false);
      }
    };

    // initial attempt
    connectIfAuthenticated();

    // Listen for token added in other tabs or login flows that set localStorage
    storageListener = (e) => {
      if (e.key === 'token' && e.newValue) {
        connectIfAuthenticated();
      }
      if (e.key === 'token' && !e.newValue) {
        // token removed (logout) -> disconnect
        realtime.disconnect();
        setIsConnected(false);
      }
    };

    window.addEventListener('storage', storageListener);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', storageListener);
      realtime.disconnect();
    };
  }, [realtime]);

  const value = {
    isConnected,
    stats,
    latestBooking,
    notification,
    subscribe: realtime.subscribe,
    onBookingUpdate: realtime.onBookingUpdate,
    onBookingCreated: realtime.onBookingCreated,
    onStatusChange: realtime.onStatusChange,
    onNotification: realtime.onNotification,
    onStats: realtime.onStats,
    onLocationUpdate: realtime.onLocationUpdate,
    publish: realtime.publish,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeContext = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within RealtimeProvider');
  }
  return context;
};

export default RealtimeContext;
