# ServPro Mobile - Docker Guide

Guide Docker pour l'application mobile ServPro (Expo).

## Prerequis

- Docker Desktop (Compose v2)
- Backend ServPro accessible (local ou distant)

## Lancer en local avec Docker Compose

Depuis `ServProMobile/`:

```bash
docker compose up --build
```

Ports exposes:
- `8081` (Expo web / Metro)
- `19000` (Expo dev server)
- `19001` (Expo bundler)

## Build image seule

Depuis `ServProMobile/`:

```bash
docker build -t servpro-mobile:latest .
docker run --rm -p 8081:8081 -p 19000:19000 -p 19001:19001 servpro-mobile:latest
```

## Push registry (exemple)

```bash
docker tag servpro-mobile:latest docker.io/<your-user>/servpro-mobile:v1
docker push docker.io/<your-user>/servpro-mobile:v1
```

## Kubernetes

- Manifest mobile: `k8s/09-mobile.yaml`
- Image mappee via `k8s/kustomization.yaml` (`servpro-mobile`)
- Hote ingress configure: `mobile.servpro.tn` / `mobile.servpro.local`

## Troubleshooting

1. Container unhealthy:
- verifier que le port `8081` est libre
- verifier les logs: `docker compose logs expo-app`

2. Mobile ne joint pas l'API:
- verifier l'URL backend dans la config Expo et/ou variables d'environnement

3. Erreur de build npm:
- supprimer cache local Docker puis rebuild: `docker builder prune -f`