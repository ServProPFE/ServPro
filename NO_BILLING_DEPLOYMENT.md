# No-Billing Deployment Guide (Render + Vercel + MongoDB Atlas)

This guide deploys:
- Backend from `ServProBackend` to Render
- Optional Python AI service from `python_ai` to Render
- Dashboard from `ServProDashboard` to Vercel
- Frontend from `ServProFrontEnd` to Vercel
- MongoDB using MongoDB Atlas free tier

## 1) Prepare MongoDB Atlas (free)

1. Create a free cluster in MongoDB Atlas.
2. Create database user and password.
3. In Network Access, add IP `0.0.0.0/0` for initial setup (tighten later).
4. Copy connection string, for example:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/servpro?retryWrites=true&w=majority`

## 2) Deploy backend on Render

You can deploy using the included `render.yaml` blueprint.

### Render dashboard steps

1. Push this repository to GitHub.
2. In Render, choose New > Blueprint.
3. Select your repository and confirm `render.yaml`.
4. Render creates:
   - `servpro-backend`
   - `servpro-python-ai` (optional, but recommended for chatbot)
5. Open `servpro-python-ai`, wait until it is live, and copy its URL.
6. Open `servpro-backend` and set environment variables:
   - `MONGODB_URI` = your Atlas URI
   - `JWT_SECRET` = strong random string
   - `CORS_ORIGINS` = `https://<frontend>.vercel.app,https://<dashboard>.vercel.app,http://localhost:5173,http://localhost:5174`
   - `PYTHON_AI_SERVICE` = URL of `servpro-python-ai` service (for example `https://servpro-python-ai.onrender.com`)
7. Redeploy backend after setting variables.
8. Verify backend health: `https://<backend>.onrender.com/health`

## 3) Deploy dashboard on Vercel

The file `ServProDashboard/vercel.json` is already prepared.

### CLI steps

1. Install and login:
   - `npm i -g vercel`
   - `vercel login`
2. Deploy from dashboard folder:
   - `cd ServProDashboard`
   - `vercel --prod`
3. In Vercel project settings, set env var:
   - `VITE_API_BASE_URL` = `https://<backend>.onrender.com`
4. Redeploy:
   - `vercel --prod`

## 4) Deploy frontend on Vercel

The file `ServProFrontEnd/vercel.json` is already prepared.

### CLI steps

1. Deploy from frontend folder:
   - `cd ../ServProFrontEnd`
   - `vercel --prod`
2. In Vercel project settings, set env var:
   - `VITE_API_BASE_URL` = `https://<backend>.onrender.com`
3. Redeploy:
   - `vercel --prod`

## 5) Final CORS update on backend

After you get final Vercel URLs, update backend `CORS_ORIGINS` on Render to include both production URLs exactly.

Example:
`https://servpro-frontend.vercel.app,https://servpro-dashboard.vercel.app,http://localhost:5173,http://localhost:5174`

Then redeploy backend.

## 6) Quick verification checklist

1. Backend health URL returns success.
2. Frontend can register/login without CORS errors.
3. Dashboard API calls succeed.
4. Chatbot endpoint works (if `servpro-python-ai` deployed and linked).
5. Providers list loads from `GET /auth/providers`.
6. Provider portfolio page loads services/portfolio sections from provider-scoped endpoints.

## Optional: Netlify instead of Vercel (frontend and dashboard)

For each app:
1. Base directory: `ServProFrontEnd` or `ServProDashboard`
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variable: `VITE_API_BASE_URL=https://<backend>.onrender.com`
