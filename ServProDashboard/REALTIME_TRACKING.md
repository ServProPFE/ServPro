# Real-Time Tracking Implementation Guide

## Overview

The SerPro Dashboard now includes a comprehensive real-time tracking system that synchronizes data across the application using WebSockets with an automatic polling fallback. This document explains the architecture, implementation, and usage.

## Architecture Components

### 1. **realtimeService.js** - WebSocket Connection Manager
**Location**: `src/services/realtimeService.js`

Core WebSocket service that manages connections and event routing.

**Key Features:**
- Automatic WebSocket connection with Bearer token authentication
- Event-based subscription system (event emitter pattern)
- Automatic reconnection with exponential backoff (3s × 2^n, max 5 attempts)
- Message routing to event-specific and global listeners
- Graceful error handling and cleanup

**Event Types Supported:**
```javascript
'booking:update'      // Existing booking status changed
'booking:created'     // New booking created
'status:change'       // Generic status change
'notification:new'    // New notification arrived
'stats:update'        // Dashboard stats updated
'location:update'     // Service location updated
```

**Usage:**
```javascript
import realtimeService from '../services/realtimeService';

// Subscribe to booking updates
const unsubscribe = realtimeService.subscribe('booking:update', (data) => {
  console.log('Booking updated:', data);
});

// Clean up subscription
unsubscribe();

// Manual connection control
await realtimeService.connect();
realtimeService.disconnect();

// Publish events (from frontend to backend)
realtimeService.publish('booking:update', { bookingId: '123', status: 'CONFIRMED' });
```

### 2. **useRealtime.js** - React Hook Wrapper
**Location**: `src/hooks/useRealtime.js`

Custom React hook that wraps realtimeService with proper lifecycle management.

**Features:**
- Automatic cleanup on component unmount
- Convenient method shortcuts
- Returns unsubscribe functions for manual cleanup

**Usage in Components:**
```javascript
import { useRealtime } from '../hooks/useRealtime';

function MyComponent() {
  const { subscribe, onBookingUpdate, onStats } = useRealtime();

  useEffect(() => {
    // Subscribe to specific event
    const unsubscribe = subscribe('booking:created', (data) => {
      console.log('New booking:', data);
    });

    // Or use convenience method
    const unsubStats = onStats((stats) => {
      console.log('Stats updated:', stats);
    });

    return () => {
      unsubscribe();
      unsubStats();
    };
  }, [subscribe, onStats]);

  return <div>Component</div>;
}
```

### 3. **RealtimeContext.jsx** - Global State Provider
**Location**: `src/context/RealtimeContext.jsx`

React Context that provides global real-time state and manages subscriptions.

**Global State:**
```javascript
{
  isConnected: boolean,           // WebSocket connection status
  stats: {
    totalBookings: number,
    pendingBookings: number,
    totalServices: number,
    totalRevenue: number
  },
  latestBooking: object | null,   // Most recent booking
  notification: object | null     // Most recent notification
}
```

**Auto-subscriptions:**
The provider automatically subscribes to all event types when mounted and cleans up on unmount.

**Usage:**
```javascript
import { useRealtimeContext } from '../context/RealtimeContext';

function Dashboard() {
  const { isConnected, stats, onBookingUpdate } = useRealtimeContext();

  useEffect(() => {
    const unsubscribe = onBookingUpdate((data) => {
      // Handle booking update
    });

    return unsubscribe;
  }, [onBookingUpdate]);

  return (
    <div>
      {isConnected ? '🟢 Live' : '🔴 Offline'}
      <p>Total Bookings: {stats.totalBookings}</p>
    </div>
  );
}
```

### 4. **pollingService.js** - Fallback Polling Mechanism
**Location**: `src/services/pollingService.js`

Provides HTTP polling as a fallback when WebSocket is unavailable.

**Features:**
- Configurable polling intervals (default: 5-10 seconds)
- Multiple data source polling
- Automatic cleanup on unsubscribe
- Error handling and recovery

**Usage:**
```javascript
import pollingService from '../services/pollingService';

// Subscribe to polling data
const unsubscribe = pollingService.subscribe('bookings', (data) => {
  console.log('Bookings from polling:', data);
}, 5000); // 5-second interval

// Stop polling for this key
unsubscribe();

// Stop all polling
pollingService.stopAllPolling();
```

### 5. **RealtimeStatus.jsx** - Visual Status Indicator
**Location**: `src/components/RealtimeStatus.jsx`

Component that displays the WebSocket connection status.

**Features:**
- Green dot + "Live" when connected
- Gray dot + "Offline" when disconnected
- Subtle color transitions

**Usage:**
```javascript
import RealtimeStatus from '../components/RealtimeStatus';

export default function Dashboard() {
  return (
    <div>
      <RealtimeStatus /> {/* Displays connection status */}
    </div>
  );
}
```

### 6. **LiveUpdates.jsx** - Toast Notifications
**Location**: `src/components/LiveUpdates.jsx`

Displays real-time updates as toast notifications in the bottom-right corner.

**Features:**
- Auto-dismisses after 5 seconds
- Shows booking updates and new bookings
- Non-intrusive design

## Integration Points

### Dashboard.jsx Integration
The Dashboard component now:
1. Uses `useRealtimeContext()` to get global real-time state
2. Sets up polling as a fallback (5-10 second intervals)
3. Subscribes to real-time updates for stats and bookings
4. Displays `RealtimeStatus` indicator with last update timestamp
5. Automatically updates stats and recent bookings

### App.jsx Integration
The root App component:
1. Wraps the entire app with `<RealtimeProvider>`
2. Includes `<LiveUpdates />` for toast notifications
3. Provides real-time context to all child components

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      Backend WebSocket Server           │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
   WebSocket         HTTP Polling      REST API
   (Primary)         (Fallback)         (Initial)
        ↓                 ↓                 ↓
┌─────────────────────────────────────────────────────────┐
│            realtimeService.js (Connection Mgmt)        │
└─────────────────────────────────────────────────────────┘
        ↓                 ↓
    Event Router    Polling Service
        ↓                 ↓
┌─────────────────────────────────────────────────────────┐
│        RealtimeContext.jsx (Global State)               │
│  - isConnected, stats, latestBooking, notification      │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│           Components & Pages (useRealtimeContext)       │
│  - Dashboard, BookingsManagement, ServicesManagement    │
│  - NotificationsManagement, etc.                         │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│              UI Updates (Realtime Display)               │
│  - Live stats, booking updates, toast notifications     │
└─────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables
Add to your `.env` file:
```env
VITE_WS_BASE_URL=ws://localhost:3000  # Backend WebSocket URL
VITE_API_BASE_URL=http://localhost:3000/api  # Backend API URL
```

### Backend Requirements
Your backend must:
1. Provide a WebSocket endpoint at `/ws` with Bearer token authentication
2. Emit events in the format: `{ type: 'event:name', data: {...} }`
3. Provide HTTP endpoints for polling:
   - `GET /api/bookings` - List bookings
   - `GET /api/services` - List services
   - `GET /api/notifications` - List notifications

## Usage Examples

### Example 1: Dashboard with Live Stats
```javascript
import { useRealtimeContext } from '../context/RealtimeContext';

export function Dashboard() {
  const { stats, isConnected } = useRealtimeContext();

  return (
    <div>
      <p>Connection: {isConnected ? '🟢' : '🔴'}</p>
      <p>Bookings: {stats.totalBookings}</p>
      <p>Pending: {stats.pendingBookings}</p>
      <p>Revenue: ${stats.totalRevenue}</p>
    </div>
  );
}
```

### Example 2: Booking Updates in Management Page
```javascript
import { useRealtimeContext } from '../context/RealtimeContext';

export function BookingsManagement() {
  const [bookings, setBookings] = useState([]);
  const { onBookingUpdate, onBookingCreated } = useRealtimeContext();

  useEffect(() => {
    // Fetch initial data
    fetchBookings();

    // Subscribe to real-time updates
    const unsubUpdate = onBookingUpdate((updatedBooking) => {
      setBookings(prev =>
        prev.map(b => b._id === updatedBooking._id ? updatedBooking : b)
      );
    });

    const unsubCreate = onBookingCreated((newBooking) => {
      setBookings(prev => [newBooking, ...prev]);
    });

    return () => {
      unsubUpdate();
      unsubCreate();
    };
  }, [onBookingUpdate, onBookingCreated]);

  return <BookingsList bookings={bookings} />;
}
```

### Example 3: Custom Real-Time Hook
```javascript
export function useBookingUpdates() {
  const [updates, setUpdates] = useState([]);
  const { onBookingUpdate } = useRealtimeContext();

  useEffect(() => {
    const unsubscribe = onBookingUpdate((data) => {
      setUpdates(prev => [data, ...prev].slice(0, 10));
    });

    return unsubscribe;
  }, [onBookingUpdate]);

  return updates;
}
```

## Error Handling

### WebSocket Connection Failures
- Automatic reconnection with exponential backoff
- Falls back to HTTP polling
- Status displayed via `RealtimeStatus` component

### Message Processing Errors
- Errors logged to console
- Application continues to function
- Listeners can handle errors gracefully

### Polling Errors
- Logged to console
- Interval continues on error
- Next poll will attempt recovery

## Performance Considerations

1. **Subscription Cleanup**: Always return cleanup functions from useEffect
2. **Polling Intervals**: Default 5-10s; adjust based on update frequency
3. **Message Batching**: Multiple rapid updates are dispatched individually
4. **Memory**: Old updates are not stored; components manage their own state

## Troubleshooting

### Real-Time Updates Not Arriving
1. Check `RealtimeStatus` shows "Live"
2. Verify backend WebSocket endpoint is running
3. Check browser DevTools Network tab for WebSocket connection
4. Verify backend sends events in correct format

### Polling Not Working
1. Check HTTP request success in DevTools Network tab
2. Verify API endpoint responses
3. Ensure pollingService is imported correctly

### UI Not Updating
1. Verify component uses `useRealtimeContext()` correctly
2. Check that unsubscribe functions are called on cleanup
3. Verify state updates trigger re-renders
4. Check React DevTools for component updates

## Future Enhancements

- [ ] Local caching for offline support
- [ ] Message compression for bandwidth optimization
- [ ] Client-side conflict resolution
- [ ] Real-time collaboration features
- [ ] Activity history/audit log
- [ ] Custom event publishing from frontend
- [ ] Real-time notifications with sound alerts

## Testing

To test real-time features:

1. **WebSocket Connection Test:**
   ```javascript
   // In browser console
   new WebSocket('ws://localhost:3000/ws')
   ```

2. **Manual Event Publishing:**
   ```javascript
   // Backend must support this
   socket.emit('booking:update', { _id: '123', status: 'CONFIRMED' })
   ```

3. **Polling Fallback Test:**
   - Close WebSocket connection in DevTools
   - Verify polling continues updating data

## Deployment Notes

- Update `VITE_WS_BASE_URL` for production environment
- Ensure backend WebSocket server is accessible from frontend
- Configure CORS/CSP for WebSocket connections
- Consider implementing rate limiting on polling requests
- Monitor WebSocket connection stability in production

---

**Last Updated**: 2024
**Version**: 1.0.0
