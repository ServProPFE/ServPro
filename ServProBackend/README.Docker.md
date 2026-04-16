# ServPro Backend - Docker Guide

Ce dossier contient une stack Docker Compose complete pour le backend ServPro:
- MongoDB
- Python AI service
- API backend Node.js

## Prerequis

- Docker Desktop (avec Compose v2)

## Lancer la stack

Depuis `ServProBackend/`:

```bash
docker compose up --build
```

Services exposes localement:
- Backend: `http://localhost:4000`
- Python AI: `http://localhost:5000`
- MongoDB: `mongodb://localhost:27017`

## Arreter et nettoyer

```bash
docker compose down
```

Supprimer aussi les volumes (base Mongo):

```bash
docker compose down -v
```

## Endpoints de verification

- Backend health: `GET http://localhost:4000/health`
- Chatbot health (Node -> Python): `GET http://localhost:4000/chatbot/health`
- Python AI health: `GET http://localhost:5000/health`

## Variables d'environnement appliquees en compose

Le service `backend` surcharge:

- `PORT=4000`
- `MONGODB_URI=mongodb://mongodb:27017/servpro`
- `PYTHON_AI_SERVICE=http://python-ai:5000`
- `NODE_ENV=development`

Le service `python-ai` charge `../python_ai/.env.example`.

## Build image backend seule

Depuis `ServProBackend/`:

```bash
docker build -t servpro-backend:latest .
docker run --rm -p 4000:4000 --env-file .env servpro-backend:latest
```

## Troubleshooting

1. Le backend ne demarre pas:
- verifier `docker compose logs backend`
- verifier que MongoDB est healthy

2. Chatbot en statut degrade:
- verifier `docker compose logs python-ai`
- verifier `PYTHON_AI_SERVICE` dans l'environnement backend

3. Port deja occupe:
- changer le mapping de ports dans `compose.yaml`