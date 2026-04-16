# ServPro Mobile Application

ServProMobile is the React Native (Expo) mobile client for ServPro.
It follows the same visual direction as the web frontend:

- Teal and orange accent palette
- Rounded premium cards with soft shadows
- Optimistic and professional product tone
- Hero sections and elevated service/offer blocks

## Features

- Home feed with hero banner, active offers, and highlighted services
- Service catalog with search and category filters
- Service details screen
- Authentication screens (login/register)
- Profile management and session persistence
- Logout actions in profile (header and quick actions)
- Bookings view with status badges
- AI chatbot screen (mobile tab)
- Providers directory and provider portfolio screens
- Localization with English/Arabic resources aligned with the frontend app
- API integration with fallback mock data for offline/demo usage

## Tech Stack

- Expo Router + React Native + TypeScript
- AsyncStorage for auth session persistence
- i18next + react-i18next + expo-localization for multilingual support
- Shared service layer for API calls and endpoint configuration

## Run the App

1. Install dependencies:

```bash
npm install
```

2. Start Expo:

```bash
npm run start
```

3. Launch platform target:

```bash
npm run android
npm run ios
npm run web
```

## Run with Docker

From `ServProMobile/`:

```bash
docker compose up --build
```

Exposed ports:
- `8081` (Expo web)
- `19000` (Expo dev server)
- `19001` (Expo bundler)

## Kubernetes Deployment

- Deployment/Service manifest: `k8s/09-mobile.yaml`
- Included in `k8s/kustomization.yaml`
- Ingress hosts: `mobile.servpro.tn`, `mobile.servpro.local`

## API Configuration

API base URL is resolved with this priority:

1. `EXPO_PUBLIC_API_BASE_URL`
2. `expo.extra.apiBaseUrl`
3. Render production fallback (`https://servpro-backend.onrender.com`)
4. LAN host inferred from Expo runtime (`http://<LAN_IP>:4000`)
5. Platform local fallback (`http://10.0.2.2:4000` on Android emulator, otherwise `http://localhost:4000`)

Set this in `ServProMobile/.env` for stable mobile deployment:

```env
EXPO_PUBLIC_API_BASE_URL=https://servpro-backend.onrender.com
```

Then restart Metro with cache clear:

```bash
npx expo start -c
```

If chatbot displays the fallback message about AI availability, check:

- `https://servpro-backend.onrender.com/chatbot/health`
- backend Render env var `PYTHON_AI_SERVICE`

For containerized/Kubernetes runs, ensure backend DNS/URL is reachable from the mobile runtime environment.

## Localization

- Mobile i18n bootstrap file: `i18n.ts`
- Locale resources: `locales/en.json` and `locales/ar.json`
- Resources mirror frontend i18n keys for consistency across web and mobile
- Selected language is persisted in AsyncStorage and can be switched from Profile (EN/AR)

## Key Folders

- `app/`: screens and routing (tabs, auth, service details, chatbot, providers)
- `components/servpro/`: reusable branded UI blocks
- `context/`: auth context and session management
- `services/`: API, auth, storage, and data providers
- `data/`: typed mock fallback data
