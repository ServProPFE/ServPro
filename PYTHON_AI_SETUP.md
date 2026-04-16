# Python AI Chatbot Integration - Setup Guide

Guide de mise en place du chatbot AI actuel de ServPro.

## Overview

Le chatbot repose sur 2 couches:
- Backend Node.js (`POST /chatbot`) pour l'orchestration et la recuperation du service recommande en base.
- Microservice Python Flask (`POST /recommend`) pour l'analyse NLP.

Moteur AI actuel:
- TF-IDF + similarite cosinus en pur Python
- score hybride (cosine + recouvrement mots-cles)
- fallback Gemini optionnel si confiance trop faible

## Architecture

```text
Frontend (5173) -> Backend Node.js (4000) -> Python AI (5000)
                                                                 \-> MongoDB (services/providers)
```

## Prerequis

- Node.js 20+
- Python 3.9+
- MongoDB local ou distant

## Installation

1. Installer dependances backend:

```bash
cd ServProBackend
npm install
```

2. Installer dependances Python AI:

```bash
cd ..\python_ai
python -m pip install -r requirements.txt
```

3. Creer les fichiers d'environnement:

```bash
cd ..\ServProBackend
copy .env.example .env
cd ..\ServProFrontEnd
copy .env.example .env
```

Variables minimales:

```env
# ServProBackend/.env
PYTHON_AI_SERVICE=http://localhost:5000
PORT=4000
MONGODB_URI=mongodb://localhost:27017/servpro
JWT_SECRET=change_me
```

```env
# python_ai/.env (optionnel)
GEMINI_API_KEY=your_real_key
```

## Demarrage

Option A - script Windows:

```bat
start_all.bat
```

Ce script lance Python AI, backend et frontend client.

Option B - manuel (3 terminaux):

```bash
# Terminal 1
cd python_ai
python app.py

# Terminal 2
cd ServProBackend
npm run dev

# Terminal 3
cd ServProFrontEnd
npm run dev
```

## Tester rapidement

1. Ouvrir `http://localhost:5173`.
2. Se connecter avec un compte seed (si seed execute).
3. Ouvrir le chatbot et tester:
     - `I need a plumber`
     - `My air conditioning is broken`
     - `أحتاج كهربائي`

## Tester l'API Python directement

```bash
curl -X POST http://localhost:5000/recommend ^
    -H "Content-Type: application/json" ^
    -d "{\"text\":\"I need a plumber\",\"language\":\"en\"}"
```

Exemple de reponse:

```json
{
    "detected_service": "plomberie",
    "confidence": 0.21,
    "language": "en",
    "message": "Detected Plomberie with 21% confidence...",
    "recommendations": [
        {
            "service_name": "Plomberie",
            "category": "PLOMBERIE",
            "confidence": 0.21
        }
    ]
}
```

## Endpoints chatbot utiles

Backend Node.js:
- `POST /chatbot`
- `POST /chatbot/analyze`
- `GET /chatbot/suggestions`
- `GET /chatbot/health`

Python AI:
- `GET /health`
- `GET /services`
- `POST /recommend`
- `POST /analyze`

## Troubleshooting

1. `ECONNREFUSED 127.0.0.1:5000`
- Verifier que Python AI tourne
- Verifier `PYTHON_AI_SERVICE` dans `ServProBackend/.env`

2. `ModuleNotFoundError`

```bash
cd python_ai
python -m pip install -r requirements.txt
```

3. Port 5000 occupe (Windows)

```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

4. Le chatbot repond sans fallback AI
- Verifier que `GEMINI_API_KEY` est configure si vous voulez le fallback.
- Sans cle, le service fonctionne quand meme avec le moteur local.

## Notes importantes

- Le moteur AI n'utilise pas `scikit-learn` ni `numpy`.
- Le seuil de confiance par defaut pour recommander un service est `0.08`.
- Les recommandations finales incluent les donnees reelles du provider depuis MongoDB (via le backend Node.js).

