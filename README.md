# ServPro Platform

Plateforme de services professionnels avec plusieurs depots Git separes:
- une API backend Node.js,
- une application client React,
- un dashboard prestataire/admin React,
- une application mobile React Native (Expo),
- un microservice Python AI pour le chatbot.

Langues supportees: anglais et arabe (RTL).

## Depots du workspace

1. `ServProBackend`
- API REST Express + MongoDB
- Auth JWT, RBAC, reservations, transactions, factures, etc.
- Delegation NLP du chatbot vers le service Python

2. `ServProFrontEnd`
- Application client (React + Vite)
- Exploration de services via Fuseki et ontologie, reservation, suivi, historique des transactions, chatbot
- Suggestions IA sur la page d'accueil, requetes ontologiques, et annuaire prestataires avec filtres/insights

3. `ServProDashboard`
- Back-office prestataire/admin (React + Vite)
- Gestion services, reservations, offres, disponibilites, transactions, factures
- Tableau de bord enrichi avec des insights operationnels bases sur les donnees live

4. `python_ai`
- Microservice Flask sur `:5000`
- Moteur TF-IDF + similarite cosinus en pur Python
- Fallback Gemini optionnel via `GEMINI_API_KEY`

5. `ServProMobile`
- Application mobile (Expo Router + React Native)
- Flux auth, catalogue services, details et reservations
- Chatbot AI mobile (tab dedie)
- Annuaire prestataires et portfolio prestataire
- Peut tourner en local (Expo), Docker et Kubernetes

## Ports par defaut

- Backend: `http://localhost:4000`
- Frontend client: `http://localhost:5173`
- Dashboard: `http://localhost:5174`
- Python AI: `http://localhost:5000`
- Mobile Expo web: `http://localhost:8081`
- MongoDB local: `mongodb://localhost:27017`

## Prerequis

- Node.js 20+
- npm 10+
- Python 3.9+
- MongoDB 7+ (local) ou une URI distante

## Demarrage rapide (manuel)

1. Backend

```bash
cd ServProBackend
npm install
copy .env.example .env
npm run dev
```

2. Python AI

```bash
cd python_ai
python -m pip install -r requirements.txt
python app.py
```

3. Frontend client

```bash
cd ServProFrontEnd
npm install
copy .env.example .env
npm run dev
```

4. Dashboard

```bash
cd ServProDashboard
npm install
copy .env.example .env
npm run dev
```

## Demarrage rapide (Windows helper)

Le script `start_all.bat` lance:
- Python AI (`:5000`)
- Backend (`:4000`)
- Frontend client (`:5173`)

```bat
start_all.bat
```

Note: ce script ne demarre pas le dashboard.

## Demarrage via Docker Compose

Chaque projet dispose de son `compose.yaml` local:

- Backend stack:

```bash
cd ServProBackend
docker compose up --build
```

- Frontend client:

```bash
cd ServProFrontEnd
docker compose up --build
```

- Dashboard:

```bash
cd ServProDashboard
docker compose up --build
```

## Variables d'environnement

Backend (`ServProBackend/.env`):

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/servpro
NODE_ENV=development
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
PYTHON_AI_SERVICE=http://localhost:5000
```

Frontend & dashboard (`.env`):

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_BASE_URL=ws://localhost:4000
```

Python AI (`python_ai/.env` optionnel):

```env
GEMINI_API_KEY=your_real_key
```

Mobile (`ServProMobile/.env`):

```env
EXPO_PUBLIC_API_BASE_URL=https://servpro-backend.onrender.com
```

## Deploiement Render (prod)

Chaque depot a son propre `render.yaml`:

- `ServProBackend/render.yaml` pour le backend
- `python_ai/render.yaml` pour le service AI

Variables critiques backend (Render):

```env
PYTHON_AI_SERVICE=https://servpro-python-ai.onrender.com
PYTHON_AI_TIMEOUT_MS=20000
PYTHON_AI_RETRIES=3
PYTHON_AI_RETRY_BASE_DELAY_MS=2000
PYTHON_AI_HEALTH_TIMEOUT_MS=20000
PYTHON_AI_HEALTH_RETRIES=3
```

Verification post-deploiement backend:

- `https://servpro-backend.onrender.com/health`
- `https://servpro-backend.onrender.com/chatbot/health`

Si `chatbot/health` retourne `degraded`, verifier en priorite la variable `PYTHON_AI_SERVICE` et les logs du service Python AI.

## Real-Time Tracking System (Dashboard)

Le dashboard `ServProDashboard` est equipe d'un systeme de suivi en temps reel utilisant WebSocket avec fallback HTTP polling automatique:

- **Connexion primaire**: WebSocket pour les mises a jour instantanees
- **Fallback**: Polling HTTP (intervalles 5-10 secondes) si WebSocket indisponible
- **Statut visuel**: Indicateur "Live" (🟢) ou "Offline" (🔴) dans l'en-tete
- **Notifications**: Toast notifications pour les evenements (nouvelles commandes, mises a jour, etc.)

### Requirements backend
Le backend doit fournir:
1. Endpoint WebSocket a `/ws` avec authentification Bearer token
2. Broadcast d'evenements JSON: `{ type: 'event:name', data: {...} }`
3. Evenements supports: `booking:created`, `booking:update`, `stats:update`, `notification:new`, etc.

**Voir [ServProDashboard/INTEGRATION_CHECKLIST.md](ServProDashboard/INTEGRATION_CHECKLIST.md) pour les details d'implementation.**

## Fonctions principales

- RBAC: `CLIENT`, `PROVIDER`, `ADMIN`
- Flux reservation: `PENDING -> CONFIRMED -> IN_PROGRESS -> DONE`
- Transactions creees automatiquement a la confirmation
- Chatbot bilingue avec suggestion de service et details prestataire
- Suggestions rapides reutilisees entre mobile, front web, et chatbot
- Recherche de services et de prestataires via Fuseki et l'ontologie du domaine
- Insights prestataire/admin pour suivre les categories fortes, la qualite des profils et les tendances de performance
- i18n EN/AR avec RTL cote frontend et dashboard
- Annuaire prestataires: routes frontend `/providers` et `/providers/:providerId`
- Endpoint public backend `GET /auth/providers` pour lister les utilisateurs `PROVIDER`
- Fallback d'affichage des noms de services (`serviceNames.*`) cote frontend

## Documentation par module

- Backend: `ServProBackend/README.md`
- Backend Docker: `ServProBackend/README.Docker.md`
- Python AI: `python_ai/README.md`
- Frontend client: `ServProFrontEnd/README.md`
- Frontend Docker: `ServProFrontEnd/README.Docker.md`
- Dashboard: `ServProDashboard/README.md`
- Dashboard Docker: `ServProDashboard/README.Docker.md`
- Mobile: `ServProMobile/README.md`
- Mobile Docker: `ServProMobile/README.Docker.md`
- Ontologie et Fuseki: `ontology/README.md`
- Kubernetes manifests: `k8s/README.md`
- Setup chatbot Python AI: `PYTHON_AI_SETUP.md`

## Licence

Projet academique sous licence MIT.
