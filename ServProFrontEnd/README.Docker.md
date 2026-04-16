# ServPro FrontEnd - Docker Guide

Guide Docker pour l'application client ServPro.

## Prerequis

- Docker Desktop (Compose v2)
- Backend ServPro disponible sur `http://localhost:4000` en local ou sur Render en production

## Lancer le frontend client

Depuis `ServProFrontEnd/`:

```bash
docker compose up --build
```

Application disponible sur:
- `http://localhost:5173`

## Configuration API

Par defaut, `compose.yaml` utilise:

```env
VITE_API_BASE_URL=http://localhost:4000
```

Pour pointer vers une autre API, definir la variable avant de lancer compose. En production, utiliser par exemple:

```env
VITE_API_BASE_URL=https://servpro-backend.onrender.com
```

## Arreter

```bash
docker compose down
```

## Build image seule

Depuis `ServProFrontEnd/`:

```bash
docker build -t servpro-frontend:latest .
docker run --rm -p 5173:5173 -e VITE_API_BASE_URL=http://localhost:4000 servpro-frontend:latest
```

## Troubleshooting

1. Ecran vide ou erreurs API:
- verifier que le backend est joignable depuis le navigateur
- verifier `VITE_API_BASE_URL`

2. Port 5173 deja utilise:
- changer le mapping de ports dans `compose.yaml`

3. Container en boucle:
- consulter `docker compose logs frontend`