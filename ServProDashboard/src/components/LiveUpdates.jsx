import { useState, useEffect } from 'react';
import { useRealtimeContext } from '../context/RealtimeContext';

const LiveUpdates = () => {
  const { onBookingUpdate, onBookingCreated } = useRealtimeContext();
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const unsubscribeUpdate = onBookingUpdate((data) => {
      addUpdate('Booking Updated', `Booking ${data._id?.substring(0, 8)} status changed to ${data.status}`);
    });

    const unsubscribeCreated = onBookingCreated((data) => {
      addUpdate('New Booking', `New booking ${data._id?.substring(0, 8)} created`);
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeCreated();
    };
  }, [onBookingUpdate, onBookingCreated]);

  const addUpdate = (title, message) => {
    const id = Date.now();
    setUpdates(prev => [{ id, title, message, timestamp: new Date() }, ...prev].slice(0, 5));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setUpdates(prev => prev.filter(u => u.id !== id));
    }, 5000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {updates.map(update => (
        <div
          key={update.id}
          className="rounded-lg bg-white p-4 shadow-lg border border-emerald-200 animate-in slide-in-from-bottom-4"
        >
          <p className="text-sm font-semibold text-emerald-700">{update.title}</p>
          <p className="text-xs text-slate-600 mt-1">{update.message}</p>
          <span className="text-xs text-slate-400 mt-2 block">
            {update.timestamp.toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export default LiveUpdates;
