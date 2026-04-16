# ServPro Frontend (Client)

Customer-facing web app for browsing services, viewing details, and booking providers.

## Tech Stack
- React 19 + Vite
- React Router
- react-i18next (Bilingual AR/EN with RTL support)
- Fetch-based API client

## Features
- 🌍 **Bilingual Support**: Full Arabic & English interface with RTL (Right-to-Left) layout
- 🔍 Service discovery and filtering
- 📅 Online booking system
- 📈 Booking history with status tracking
- ⭐ Customer reviews and ratings
- 👤 User profile management
- 💳 **Transaction history** (new)
- 🤖 **AI Chatbot Assistant**: Detects service intent and returns actionable recommendations in EN/AR
- 🌙 Auto language detection with localStorage persistence
- 🧑‍🔧 **Providers directory** with portfolio browsing
- 🧾 **Provider portfolio sections**: info artisant, realisations, localisation, equipe, equipements, certificats, chiffrement, disponibilites
- 🛟 Safe service-name rendering fallback for unknown i18n keys (example: `serviceNames.apartmentCleaning`)

## Requirements
- Node.js 20+
- Backend running locally on `http://localhost:4000` or deployed on Render
- AI chatbot is handled by the backend via its configured `PYTHON_AI_SERVICE`

## Setup
```bash
npm install
```

Create `.env` (or copy `.env.example`) and set:
```
VITE_API_BASE_URL=http://localhost:4000
```

For production, point `VITE_API_BASE_URL` to the Render backend URL, for example:

```env
VITE_API_BASE_URL=https://servpro-backend.onrender.com
```

## Run
```bash
npm run dev
```

Default dev URL: `http://localhost:5173`

## Key Routes
- `/` Home (services + offers)
- `/services` Services list with filtering
- `/services/:id` Service details + booking form
- `/login` Client login
- `/register` Client registration
- `/my-bookings` Client bookings history (protected)
- `/my-transactions` Transaction history (protected) (new)
- `/providers` Providers listing page
- `/providers/:providerId` Provider portfolio page

## Chatbot Integration

- Frontend calls `POST /chatbot` on the backend (which delegates NLP to the separately deployed Python AI service).
- Chatbot responses include `message`, `confidence`, and optional `recommendedService`.
- `recommendedService.provider` is an object (`_id`, `name`, `email`, `phone`) and should be rendered using text fields (e.g., provider name), not as a raw object.

If you are testing production, verify the backend first:

- `https://servpro-backend.onrender.com/health`
- `https://servpro-backend.onrender.com/chatbot/health`

## Internationalization (i18n)

### Language Switching
- Click language toggle in navbar to switch between English and Arabic
- Preference is saved to localStorage
- RTL layout automatically applied for Arabic

### Translation Files
Located in `src/locales/`:
- `en.json` - English translations
- `ar.json` - Arabic translations (العربية)

### Key Features
- Auto-detection of browser language
- RTL (Right-to-Left) support for Arabic
- Date formatting based on language
- All UI strings translated
- Auth subtitle key available in both locales: `auth.subtitle`
- Unknown service translation keys are humanized instead of displayed raw

## API Notes
- List endpoints return `{ items: [...] }`.
- Providers list uses `GET /auth/providers`.
- Bookings list uses `GET /bookings?clientId=...`.
- Transactions list uses `GET /transactions`.
- Reservation details are created via `POST /reservation-details` before booking.
- Transactions created automatically when booking is CONFIRMED.
- Chatbot endpoint: `POST /chatbot` with `{ message, language }`.
- Provider portfolio page reads:
	- `GET /services?providerId=...`
	- `GET /portfolios?providerId=...`
	- `GET /availability?providerId=...` (auth required)
	- `GET /certifications?providerId=...` (auth required)

## Common Issues
- 404 or HTML response: confirm `VITE_API_BASE_URL` is set to the backend port.
- Empty lists: ensure backend returns `{ items: [...] }` and the user is logged in.
- Language not switching: clear browser cache and localStorage
- RTL not working: check if Arabic is selected in language switcher

## Project Structure
```
src/
├── components/        # Reusable React components
├── pages/            # Page components
├── context/          # React Context (Auth, etc)
├── services/         # API service layer
├── config/           # Configuration (API endpoints)
├── styles/           # CSS files
├── locales/          # i18n translation files (EN, AR)
│   ├── en.json      # English
│   └── ar.json      # Arabic
└── App.jsx           # Main app component
```
