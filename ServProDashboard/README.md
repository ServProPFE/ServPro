# ServPro Dashboard (Provider/Admin)

Back-office web app for providers and admins to manage services, bookings, offers, invoices, portfolio, transactions, and availability.

## Tech Stack
- React 19 + Vite
- React Router
- react-i18next (Bilingual AR/EN with RTL support)
- Fetch-based API client
- **WebSocket** (Real-time updates with HTTP polling fallback)
- Tailwind CSS (Utility-first styling with animations)

## Features
- 🌍 **Bilingual Support**: Full Arabic & English interface with RTL (Right-to-Left) layout
- 📊 Dashboard with key metrics and AI-style operational insights
- 📋 Service management
- 📅 Booking management with status updates
- 💰 **Transaction management** (Admin)
- 🎁 Promotional offers management
- 💼 Portfolio management (Provider)
- ✅ Availability management (Provider)
- 📄 Invoice management
- 🌙 Auto language detection with localStorage persistence
- 🔴 **Real-Time Updates**: Live WebSocket-based data synchronization with automatic HTTP polling fallback
- 📡 **Connection Status Indicator**: Visual feedback showing live/offline status
- 🔔 **Live Toast Notifications**: Real-time updates for bookings and events

## Requirements
- Node.js 20+
- Backend running locally on `http://localhost:4000` or deployed on Render
- Chatbot AI is handled by the backend through its separately deployed Python AI service

## Setup
```bash
npm install
```

Create `.env` (or copy `.env.example`) and set:
```
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_BASE_URL=ws://localhost:4000
```

For production, point to the backend Render URL:

```env
VITE_API_BASE_URL=https://servpro-backend.onrender.com
VITE_WS_BASE_URL=wss://servpro-backend.onrender.com
```

### Real-Time Tracking Configuration
- `VITE_WS_BASE_URL`: WebSocket server URL for real-time updates (uses `wss://` for production)
- Automatic fallback to HTTP polling (5-10s intervals) if WebSocket unavailable
- Bearer token authentication required (same token from login)
- Connection status displayed in Dashboard header (🟢 Live / 🔴 Offline)

## Run
```bash
npm run dev
```

Default dev URL: `http://localhost:5174`

## Internationalization (i18n)

### Language Switching
- Click language toggle in sidebar to switch between English and Arabic
- Preference is saved to localStorage
- RTL layout automatically applied for Arabic

### Translation Files
Located in `src/locales/`:
- `en.json` - English translations
- `ar.json` - Arabic translations (العربية)

### Key Features
- Auto-detection of browser language
- RTL (Right-to-Left) support for Arabic
- All UI strings translated including tables, forms, and alerts

## Role Access

### PROVIDER Access:
- Dashboard (view-only)
- Services (create/update/edit own services)
- Bookings (manage own booking statuses)
- Offers (create/update/edit own offers)
- Portfolio (create/update work samples)
- Availability (set own schedule)
- Invoices (view own invoices)

### ADMIN Access (all Provider features + extra):
- Services (full CRUD for all services)
- Bookings (manage all bookings)
- Offers (full CRUD)
- **Transactions Management** (view/filter/update status/delete) (new)
- Invoices (create/update/delete all invoices)
- Users management (view all users)

## Key Routes
- `/` Dashboard overview
- `/services` Manage services
- `/bookings` Manage bookings with status updates
- `/offers` Manage promotional offers
- `/transactions` **Manage transactions** (Admin only) (new)
- `/invoices` View/manage invoices
- `/portfolio` Portfolio (Provider only)
- `/availability` Schedule (Provider only)

## Transaction Management (Admin Only)

The new transactions management system allows admins to:
- View all platform transactions
- Filter by status (ALL, PENDING, SUCCESS, FAILED)
- Update transaction status
- Delete transactions
- See formatted booking info (Service - Provider Name)

### Transaction Statuses
- **PENDING**: Payment pending
- **SUCCESS**: Payment successful
- **FAILED**: Payment failed

### Payment Methods
- Card
- Cash
- PayPal
- Apple Pay
- Google Pay
- KNET

## API Notes
- List endpoints return `{ items: [...] }`.
- Booking status updates use `PUT /bookings/:id` with status field.
- Transactions endpoint: `GET/PUT/DELETE /transactions`
- Transactions auto-created when booking status changes to CONFIRMED
- Chatbot endpoints are proxied by the backend to the standalone Python AI service

## Real-Time Tracking System

The dashboard features a real-time WebSocket-based tracking system that automatically synchronizes data across all pages.

### How It Works
- **Primary**: WebSocket connection for instant updates
- **Fallback**: HTTP polling (5-10 second intervals) when WebSocket unavailable
- **Status**: Visual indicator showing Live (🟢) or Offline (🔴)
- **Notifications**: Toast notifications in bottom-right for booking events

### Architecture
```
Backend WebSocket Server
         ↓
    ┌────┴────┐
    ↓         ↓
  WebSocket  HTTP Polling
    ↓         ↓
    └────┬────┘
         ↓
    RealtimeContext (Global State)
         ↓
    Dashboard & Pages (useRealtimeContext)
         ↓
    Real-Time Updates & Live Status
```

### Real-Time Events Supported
- `booking:created` - New booking created
- `booking:update` - Booking status changed
- `stats:update` - Dashboard statistics updated
- `notification:new` - New notification arrived
- `status:change` - Generic status changes
- `location:update` - Service location changed

### Using Real-Time Data in Components
```javascript
import { useRealtimeContext } from '../context/RealtimeContext';

function MyComponent() {
  const { isConnected, stats, onBookingUpdate, onStats } = useRealtimeContext();

  useEffect(() => {
    // Subscribe to booking updates
    const unsubscribe = onBookingUpdate((data) => {
      console.log('Booking updated:', data);
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

### Dashboard Real-Time Features
- Connection status indicator in header
- Last update timestamp
- Live stats display with polling fallback
- Automatic dashboard refresh on booking changes
- Recent bookings list updates in real-time

### Backend Requirements for Real-Time
Your backend must:
1. Provide WebSocket endpoint at `/ws` with Bearer token authentication
2. Emit events in JSON format: `{ type: 'event:name', data: {...} }`
3. Broadcast events to all connected clients
4. Provide HTTP endpoints for polling fallback:
   - `GET /api/bookings`
   - `GET /api/services`
   - `GET /api/notifications`

See **[INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md)** for detailed backend setup instructions.

### Configuration
Set WebSocket URL in `.env`:
```env
# Development
VITE_WS_BASE_URL=ws://localhost:4000

# Production
VITE_WS_BASE_URL=wss://servpro-backend.onrender.com
```

### Troubleshooting Real-Time Issues
- **Connection won't establish**: Check backend WebSocket endpoint is running
- **Status shows Offline**: Verify `VITE_WS_BASE_URL` is correct
- **No updates arriving**: Check browser DevTools Network tab for WebSocket connection
- **Updates delayed**: Falls back to polling (5-10s intervals) automatically

## Operations Insights

- The dashboard surfaces a quick AI-style summary built from bookings and services data.
- It highlights the top service category, completion rate, average revenue per completed booking, and a recommended next action.
- These insights are intended to help providers/admins prioritize confirmations, promote high-demand services, and plan catalog growth.

## Common Issues
- **Access denied**: Check user role matches the page requirements
- **404 or HTML response**: Confirm `VITE_API_BASE_URL` is set to the backend port
- **Language not switching**: Clear browser cache and localStorage
- **RTL not working**: Check if Arabic is selected in language switcher
- **Transactions page not visible**: Ensure you are logged in as ADMIN
- **Real-time status shows Offline**: Verify `VITE_WS_BASE_URL` environment variable is set correctly
- **Stats not updating in real-time**: Check backend WebSocket endpoint is running; system will fall back to polling (5-10s intervals)
- **Toast notifications not appearing**: Ensure LiveUpdates component is rendered in App.jsx (it should be by default)

## Project Structure
```
src/
├── components/        # Reusable React components
│   ├── RealtimeStatus.jsx        # Connection status indicator (Real-Time)
│   ├── LiveUpdates.jsx           # Toast notifications (Real-Time)
│   ├── StatsCard.jsx
│   ├── Sidebar.jsx
│   └── ...
├── pages/            # Page components
│   ├── Dashboard.jsx             # Integrated with real-time tracking
│   ├── ServicesManagement.jsx    # Interactive hover effects
│   ├── BookingsManagement.jsx
│   ├── TransactionsManagement.jsx
│   ├── OffersManagement.jsx
│   ├── InvoicesManagement.jsx
│   └── ...
├── context/          # React Context
│   ├── AuthContext.jsx
│   └── RealtimeContext.jsx       # Global real-time state provider (NEW)
├── hooks/            # Custom React hooks
│   └── useRealtime.js            # WebSocket hook wrapper (NEW)
├── services/         # API & Real-Time services
│   ├── apiService.js
│   ├── realtimeService.js        # WebSocket connection manager (NEW)
│   └── pollingService.js         # HTTP polling fallback (NEW)
├── config/           # Configuration
├── styles/           # CSS files (including hover effects)
├── locales/          # i18n translation files (EN, AR)
│   ├── en.json      # English
│   └── ar.json      # Arabic
└── App.jsx           # Main app component (wrapped with RealtimeProvider)
```

## Authentication

- Login required for all pages
- Role-based access control (RBAC)
- JWT token stored in localStorage
- Auto logout on token expiration
