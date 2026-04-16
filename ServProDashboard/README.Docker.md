# ServPro Dashboard - Docker Guide

Guide Docker pour le back-office prestataire/admin.

## Prerequis

- Docker Desktop (Compose v2)
- Backend ServPro disponible sur `http://localhost:4000`

## Lancer le dashboard

Depuis `ServProDashboard/`:

```bash
docker compose up --build
```

Application disponible sur:
- `http://localhost:5174`

## Configuration API

Par defaut, `compose.yaml` utilise:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Arreter

```bash
docker compose down
```

## Build image seule

Depuis `ServProDashboard/`:

```bash
docker build -t servpro-dashboard:latest .
docker run --rm -p 5174:5174 -e VITE_API_BASE_URL=http://localhost:4000 servpro-dashboard:latest
```

## Troubleshooting

1. Erreurs d'acces / redirection login:
- verifier que vous etes connecte avec le bon role
- verifier la validite du token JWT

2. App ne charge pas les donnees:
- verifier le backend `http://localhost:4000`
- verifier `VITE_API_BASE_URL`

3. Port 5174 deja utilise:
- changer le mapping de ports dans `compose.yaml`