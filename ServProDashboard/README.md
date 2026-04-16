# ServPro Dashboard (Provider/Admin)

Back-office web app for providers and admins to manage services, bookings, offers, invoices, portfolio, transactions, and availability.

## Tech Stack
- React 19 + Vite
- React Router
- react-i18next (Bilingual AR/EN with RTL support)
- Fetch-based API client

## Features
- 🌍 **Bilingual Support**: Full Arabic & English interface with RTL (Right-to-Left) layout
- 📊 Dashboard with key metrics
- 📋 Service management
- 📅 Booking management with status updates
- 💰 **Transaction management** (Admin)
- 🎁 Promotional offers management
- 💼 Portfolio management (Provider)
- ✅ Availability management (Provider)
- 📄 Invoice management
- 🌙 Auto language detection with localStorage persistence

## Requirements
- Node.js 20+
- Backend running on `http://localhost:4000`

## Setup
```bash
npm install
```

Create `.env` (or copy `.env.example`) and set:
```
VITE_API_BASE_URL=http://localhost:4000
```

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

## Common Issues
- Access denied: Check user role matches the page requirements
- 404 or HTML response: confirm `VITE_API_BASE_URL` is set to the backend port
- Language not switching: clear browser cache and localStorage
- RTL not working: check if Arabic is selected in language switcher
- Transactions page not visible: ensure you are logged in as ADMIN

## Project Structure
```
src/
├── components/        # Reusable React components (Navbar, Sidebar, etc)
├── pages/            # Page components
│   ├── Dashboard.jsx
│   ├── ServicesManagement.jsx
│   ├── BookingsManagement.jsx
│   ├── TransactionsManagement.jsx  # New
│   ├── OffersManagement.jsx
│   ├── InvoicesManagement.jsx
│   └── ...
├── context/          # React Context (Auth, etc)
├── services/         # API service layer
├── config/           # Configuration (API endpoints)
├── styles/           # CSS files
├── locales/          # i18n translation files (EN, AR)
│   ├── en.json      # English
│   └── ar.json      # Arabic
└── App.jsx           # Main app component
```

## Authentication

- Login required for all pages
- Role-based access control (RBAC)
- JWT token stored in localStorage
- Auto logout on token expiration
