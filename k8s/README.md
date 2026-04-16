# ServPro Kubernetes Manifests

This folder contains a complete base deployment for:
- MongoDB
- Python AI service
- Backend API
- Frontend
- Dashboard
- Mobile (Expo web / Metro)
- Ingress routing

## 1) Configure your registry (simple way)

Edit `kustomization.yaml` and replace `yourdockerhubuser` with your Docker Hub username.
You can also change `newTag` from `v1` to any release tag (example: `2026-03-31-1`).

This lets you manage registry image names in one file only.

## 2) Build and push images

From the project root, run:

```bash
docker login

docker build -t docker.io/hechmi10/servpro-python-ai:v1 python_ai
docker push docker.io/hechmi10/servpro-python-ai:v1

docker build -t docker.io/hechmi10/servpro-backend:v1 ServProBackend
docker push docker.io/hechmi10/servpro-backend:v1

docker build -t docker.io/hechmi10/servpro-frontend:v1 ServProFrontEnd
docker push docker.io/yourdockerhubuser/servpro-frontend:v1

docker build -t docker.io/hechmi10/servpro-dashboard:v1 ServProDashboard
docker push docker.io/hechmi10/servpro-dashboard:v1

docker build -t docker.io/hechmi10/servpro-mobile:v1 ServProMobile
docker push docker.io/hechmi10/servpro-mobile:v1
```

## 3) Set secrets

Edit `02-secret.yaml` and replace placeholder values.

## 4) Set ingress hostnames

Edit `08-ingress.yaml` if you do not use:
- app.servpro.local
- dashboard.servpro.local
- api.servpro.local
- mobile.servpro.local

If you serve frontend and dashboard from Vercel instead of Kubernetes, keep the backend `CORS_ORIGINS` value aligned with the exact Vercel URLs.
## 5) Deploy

```bash
kubectl apply -k k8s
```

## 6) Verify

```bash
kubectl get pods -n servpro
kubectl get svc -n servpro
kubectl get ingress -n servpro
```

## 7) Expose on a public IP

1. Ensure your ingress controller service is public (`LoadBalancer` on cloud).
2. Get external IP:

```bash
kubectl get svc -n ingress-nginx
```

3. Create DNS A records that point to this IP:
- app.servpro.tn
- dashboard.servpro.tn
- api.servpro.tn
- mobile.servpro.tn

4. Keep `08-ingress.yaml` hosts aligned with your DNS names.

## 8) TLS certificate

`08-ingress.yaml` expects secret `servpro-tls` in namespace `servpro`.
Create it with:

```bash
kubectl -n servpro create secret tls servpro-tls --cert=fullchain.pem --key=privkey.pem
```

## Included manifests

- `00-namespace.yaml`
- `01-configmap.yaml`
- `02-secret.yaml`
- `03-mongodb.yaml`
- `04-python-ai.yaml`
- `05-backend.yaml`
- `06-frontend.yaml`
- `07-dashboard.yaml`
- `08-ingress.yaml`
- `09-mobile.yaml`
