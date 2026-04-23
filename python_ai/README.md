# Python AI Chatbot Service

This is a Flask-based microservice that provides intent detection for the chatbot using a hybrid NLP pipeline:

- Pure-Python TF-IDF + cosine similarity (no scikit-learn / numpy required)
- Structured LLM classification with Google Gemini
- Score fusion (TF-IDF + LLM) for more robust routing

## Architecture

```
Frontend (React)
    ↓
Node.js Backend (Port 4000)
    ↓
Python AI Service (Port 5000) ← Hybrid NLP (TF-IDF + LLM)
    ↓
MongoDB (Services Database)
```

## Features

- **Pure Python NLP Engine**: TF-IDF + cosine similarity implemented without external ML libraries
- **Structured LLM NLP Classification**: Gemini extracts service intent, issue type, and confidence in JSON format
- **Hybrid Score Fusion**: Combines TF-IDF and LLM scores for final routing decisions
- **Actionable Responses**: Returns service-specific guidance (not confidence only)
- **Issue Type Detection**: Detects subtype hints (e.g., leak, wiring, no cooling, dust)
- **Bilingual Support**: English and Arabic response generation, with multilingual keyword sets (EN/FR/AR)
- **Arabic Token Normalization**: Handles common prefixes to improve matching quality
- **Gemini AI Fallback**: Intelligent fallback when no reliable service can be detected
- **Detailed Debug Output**: Per-service `all_scores` with `cosine_score`, `keyword_score`, `llm_score`, `combined_score`, and `matched_keywords`

## Installation

### Prerequisites

- Python 3.9+
- pip (Python package manager)

### Setup

1. **Install Dependencies**:
```bash
cd python_ai
pip install -r requirements.txt
```

2. **Verify Installation**:
```bash
python -m flask --version
python -m py_compile app.py
```

### Gemini API Setup (Optional but Recommended)

The service can run without Gemini, but hybrid NLP+LLM routing is enabled when an API key is provided.

**To enable Gemini integration:**

1. **Get API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key for Gemini

2. **Set Environment Variable**:
   
   **Windows (PowerShell):**
   ```powershell
   $env:GEMINI_API_KEY="your-api-key-here"
   ```
   
   **Windows (Command Prompt):**
   ```cmd
   set GEMINI_API_KEY=your-api-key-here
   ```
   
   **macOS/Linux:**
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

3. **Permanent Setup** (Add to `.env` file):
   ```bash
   # In ServProBackend/.env
   GEMINI_API_KEY=your-api-key-here
   ```

4. **Optional Behavior Controls**:
  ```bash
  # Enable/disable LLM integration entirely (default: true)
  LLM_ENABLED=true

  # TF-IDF weight in blended score (0..1, default: 0.6)
  LLM_BLEND_ALPHA=0.6

  # Minimum confidence to trust LLM direct routing (default: 0.15)
  LLM_MIN_CONFIDENCE=0.15

  # Timeout for LLM requests in seconds (default: 8)
  LLM_TIMEOUT_SECONDS=8
  ```

**Note:** Without API key/config, the service still works with TF-IDF-only routing.

### Production safety guard for manual submissions

To prevent manual training submissions in production, use:

```bash
MANUAL_FEEDBACK_ENABLED=false
```

When disabled, `POST /feedback` returns `403` and the AI stays read-only for live traffic.

### Fetch backend context per prompt

The AI can fetch live backend services for each prompt and use them as context during classification.

```bash
BACKEND_CONTEXT_ENABLED=true
BACKEND_CONTEXT_BASE_URL=https://your-backend-url
BACKEND_CONTEXT_TIMEOUT_SECONDS=4
BACKEND_CONTEXT_MAX_ITEMS=50
```

If `BACKEND_CONTEXT_BASE_URL` is not set, the AI tries the same host as the incoming request.

## Running the Service

### Option 1: Using Batch Script (Windows)
```bash
cd python_ai
start_ai.bat
```

### Option 2: Manual Start
```bash
cd python_ai
python app.py
```

### Expected Output
```
🤖 Starting Python AI Chatbot Service...
📍 Python AI Service running on http://localhost:5000
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://0.0.0.0:5000
```

## Deploy on Render

The `render.yaml` file in this directory configures standalone deployment on Render.

### Quick Deploy

1. **Fork/Push** the repository to GitHub
2. **Connect** your repository to Render at [https://dashboard.render.com](https://dashboard.render.com)
3. **Create Blueprint**:
   - Select "New" → "Blueprint"
   - Choose your repository
   - Point to `python_ai/render.yaml`
   - Render will auto-detect the root of the AI service

4. **Set Environment Variables** (in Render dashboard):
   - `GEMINI_API_KEY`: Your Google Gemini API key (optional, but recommended for fallback responses)
   - `PYTHONUNBUFFERED`: Set to `1` (auto-configured in blueprint)

5. **Deploy**:
   - Click "Apply"
   - Render builds the Docker image and starts the service
   - Service will be available at `https://servpro-python-ai.onrender.com` (or custom subdomain)

### Health Check

Once deployed, verify the service is running:
```bash
curl https://servpro-python-ai.onrender.com/health
```

Expected response:
```json
{
  "status": "AI Chatbot service is running",
  "model": "Hybrid NLP: TF-IDF + LLM (Gemini)",
  "version": "1.1.0",
  "llm_enabled": true,
  "llm_blend_alpha": 0.6
}
```

### Integration with Backend

Once deployed on Render, configure the backend to use the AI service:

In `ServProBackend/.env` (or Render env vars):
```env
PYTHON_AI_SERVICE=https://servpro-python-ai.onrender.com
PYTHON_AI_TIMEOUT_MS=20000
PYTHON_AI_RETRIES=3
PYTHON_AI_RETRY_BASE_DELAY_MS=2000
```

The backend will retry automatically on cold start or transient failures.

### Troubleshooting Deployment

**Service won't start:**
- Check Render logs: Dashboard → Your Service → Logs
- Verify `Dockerfile` is present and valid
- Ensure `requirements.txt` is installed correctly

**Cold start delays (free plan):**
- Expected on Render free tier: initial request may take 30-60s
- Backend has built-in retry/backoff logic for this
- Upgrade to Pro tier for instant availability

**Gemini fallback not working:**
- Verify `GEMINI_API_KEY` is set in Render environment
- Check Python AI service logs for API errors

## API Endpoints

### 1. Health Check
**GET** `/health`

Check if the Python AI service is running.

**Response:**
```json
{
  "status": "AI Chatbot service is running",
  "model": "TF-IDF + Cosine Similarity (Lightweight - No ML Library)",
  "version": "1.0.0"
}
```

### 2. Recommend Service
**POST** `/recommend`

Get AI-powered service recommendation based on user input.

**Request:**
```json
{
  "text": "I need a plumber",
  "language": "en"
}
```

**Response:**
```json
{
  "user_input": "I need a plumber",
  "detected_service": "plomberie",
  "confidence": 0.21,
  "language": "en",
  "message": "Detected Plomberie with 21% confidence. This looks like a leak issue...",
  "recommendations": [
    {
      "service_name": "Plomberie",
      "category": "PLOMBERIE",
      "confidence": 0.21,
      "issue_type": "leak",
      "matched_keywords": ["leak", "sink"],
      "message": "Detected Plomberie with 21% confidence. This looks like a leak issue..."
    }
  ],
  "all_scores": {
    "plomberie": {
      "similarity": 0.21,
      "cosine_score": 0.16,
      "keyword_score": 0.30,
      "matched_keywords": ["leak", "sink"],
      "service_name": "Plomberie",
      "category": "PLOMBERIE"
    }
  }
}
```

### 3. Analyze Input
**POST** `/analyze`

### 4. Feedback (online training)
**POST** `/feedback`

Used for manual deep-model online updates. In production, this endpoint should generally be disabled with `MANUAL_FEEDBACK_ENABLED=false`.

Get detailed confidence scores for all service categories.

**Request:**
```json
{
  "text": "My air conditioning is broken",
  "language": "en"
}
```

**Response:**
```json
{
  "user_input": "My air conditioning is broken",
  "language": "en",
  "scores": {
    "climatisation": { "similarity": 0.92, "service_name": "Climatisation", "category": "CLIMATISATION" },
    "plomberie": { "similarity": 0.08, ... },
    "electricite": { "similarity": 0.05, ... },
    "nettoyage": { "similarity": 0.02, ... }
  },
  "best_match": {
    "service": "climatisation",
    "confidence": 0.92
  }
}
```

## Service Categories

The AI recognizes 4 main service categories:

| Category | Keywords | Languages |
|----------|----------|-----------|
| **Plomberie** | plombier, robinet, tuyau, fuite, eau, évier, toilette, plumbing, leak, pipe, faucet, drain, sink, سباك, سباكة, تسرب, أنبوب, حنفية | EN, FR, AR |
| **Électricité** | électricien, électrique, courant, ampoule, prise, disjoncteur, electrical, wire, circuit, power, light, breaker, كهرباء, كهربائي, أسلاك, مقبس, ضوء | EN, FR, AR |
| **Climatisation** | climatisation, ac, clim, air conditioner, chaud, froid, refroidissement, chauffage, hvac, cooling, heating, thermostat, تكييف, تبريد, تدفئة, برودة | EN, FR, AR |
| **Nettoyage** | nettoyage, propre, ménage, poussière, cleaning, sweep, dust, wash, hygiene, sanitaire, clean, maid, تنظيف, نظافة, ممسحة | EN, FR, AR |

## How It Works

### 1. Text Vectorization
The input text is normalized and converted to TF-IDF vectors using token-based processing.

**Example:**
- Input: "I need a plumber"
- Tokens: `i`, `need`, `plumber`
- TF-IDF Vector: sparse token→weight dictionary

### 2. Similarity Calculation
For each service category, we calculate the cosine similarity between the user input vector and the service keywords vector.

**Formula:**
```
Similarity = (A · B) / (||A|| × ||B||)
```

Where:
- A = user input TF-IDF vector
- B = service keywords TF-IDF vector
- Similarity ranges from 0 to 1

### 3. Confidence Scoring
The service computes confidence in two steps:

1. **TF-IDF score** per service:
`0.6 * cosine_score + 0.4 * keyword_score`

2. **Hybrid blend** with LLM:
`combined_score = (LLM_BLEND_ALPHA * tfidf_score) + ((1 - LLM_BLEND_ALPHA) * llm_score)`

**Example Scores:**
- Plomberie: 0.21 (21%) ← Recommended
- Électricité: 0.07 (7%)
- Climatisation: 0.01 (1%)
- Nettoyage: 0.00 (0%)

### 4. Service Lookup
If confidence passes threshold (default `0.08`), the Node.js backend fetches actual service details from MongoDB and returns them to the frontend.

### 5. LLM Routing + Fallback (Optional)
When Gemini is enabled, the service first attempts structured LLM classification and blends the result with TF-IDF. If no reliable service is detected, it falls back to a general helpful Gemini response.

**Fallback Trigger Condition:** no service passes confidence logic after hybrid merge

**Fallback Behavior:**
- Sends user query + service context to Gemini API
- Generates professional, optimistic response with service suggestion
- Returns bilingual responses (English/Arabic)
- Adds metadata indicator showing AI-generated content

**Example Flow:**
```
User: "How do I fix a squeaky door?"
TF-IDF Confidence: 0.02 (too low)
↓
Gemini API: Generates contextual response
↓
Response: "A squeaky door typically needs lubrication or hinge adjustment. 
Our maintenance service experts can help with this! Consider booking 
our home repair service for quick assistance."

💡 (AI-generated suggestion - Confidence: 2%)
```

**Without API Key:** Falls back to standard message asking user to clarify the service type.

## Testing

### Test with cURL

**Plumbing Service:**
```bash
curl -X POST http://localhost:5000/recommend \
  -H "Content-Type: application/json" \
  -d '{"text": "I have a leaky faucet", "language": "en"}'
```

**Electrical Service (Arabic):**
```bash
curl -X POST http://localhost:5000/recommend \
  -H "Content-Type: application/json" \
  -d '{"text": "أحتاج كهربائي", "language": "ar"}'
```

**Get Scores:**
```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "AC not working", "language": "en"}'
```

### Test with Python

```python
import requests
import json

url = "http://localhost:5000/recommend"
payload = {
    "text": "My air conditioning is not working",
    "language": "en"
}

response = requests.post(url, json=payload)
print(json.dumps(response.json(), indent=2))
```

## Node.js Backend Integration

The Node.js backend calls the Python AI service:

```javascript
// In chatbotController.js
const PYTHON_AI_SERVICE = process.env.PYTHON_AI_SERVICE || 'http://localhost:5000';

const aiResponse = await axios.post(`${PYTHON_AI_SERVICE}/recommend`, {
  text: message,
  language: language
});
```

## Environment Variables

In `ServProBackend/.env`:
```bash
PYTHON_AI_SERVICE=http://localhost:5000
GEMINI_API_KEY=your-gemini-api-key-here
LLM_ENABLED=true
LLM_BLEND_ALPHA=0.6
LLM_MIN_CONFIDENCE=0.15
LLM_TIMEOUT_SECONDS=8
```

## Troubleshooting

### Python AI Service Not Starting

**Error:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
pip install -r requirements.txt
```

### Connection Error from Node.js Backend

**Error:** `ECONNREFUSED 127.0.0.1:5000`

**Solution:**
1. Ensure Python service is running on port 5000
2. Check `PYTHON_AI_SERVICE` in `.env`
3. Verify no firewall blocking port 5000

### Port Already in Use

**Error:** `OSError: [Errno 48] Address already in use`

**Solution:**
```bash
# Find and kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :5000
kill -9 <PID>
```

### Low Confidence Scores

**Issue:** Recommendations are low or no service is detected

**Solution:**
- Add more domain keywords/synonyms in `SERVICES_DB`
- Extend `ISSUE_PATTERNS` for better actionable responses
- Verify language passed is `en` or `ar`
- Tune per-service `confidence_threshold`

## Performance

- **Response Time**: <500ms per request
- **Memory Usage**: Low footprint (no external ML model runtime)
- **Concurrent Requests**: Supports unlimited (Flask default)
- **Scalability**: Can be dockerized for production deployment

## Development

### Adding New Service Categories

Edit `app.py`:

```python
SERVICES_DB = {
    'new_service': {
        'keywords': ['keyword1', 'keyword2', ...],
        'service_name': 'Service Name',
        'category': 'NEW_SERVICE',
    'confidence_threshold': 0.08
    }
}
```

### Improving Accuracy

1. **Add more keywords** to each category
2. **Include regional dialects** (French & Arabic variations)
3. **Refine issue patterns** for more precise guidance text
4. **Tune confidence thresholds** if detection is too strict/too loose
5. **Collect real user queries** and continuously improve keyword coverage

## Production Deployment

### Docker

```dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

### Build and Run
```bash
docker build -t servpro-ai:latest .
docker run -p 5000:5000 servpro-ai:latest
```

### Docker Compose
Add to `docker-compose.yml`:
```yaml
python-ai:
  build: ./python_ai
  ports:
    - "5000:5000"
  environment:
    - FLASK_ENV=production
```

## Future Enhancements

- [ ] Machine learning model training on user queries
- [x] Intent classification via structured LLM JSON output ✅ **IMPLEMENTED**
- [ ] Entity extraction (location, time, urgency)
- [ ] Conversation memory (context awareness)
- [ ] Multi-turn dialogue support
- [ ] Sentiment analysis
- [x] Hybrid TF-IDF + Gemini routing ✅ **IMPLEMENTED**
- [ ] Speech recognition (audio to text)
- [ ] Chat analytics dashboard

## License

Same as ServPro project

## Support

For issues or questions, contact the development team.
