import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useRealtime from '../hooks/useRealtime';

const RealtimeContext = createContext();

export const RealtimeProvider = ({ children }) => {
  const realtime = useRealtime();
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [latestBooking, setLatestBooking] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const connectToRealtime = async () => {
      try {
        await realtime.connect();
        setIsConnected(true);

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
      } catch (error) {
        console.error('Failed to connect to realtime service:', error);
        setIsConnected(false);
      }
    };

    connectToRealtime();

    return () => {
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
