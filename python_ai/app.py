from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import Counter
import math
import re
import os
import json
import random
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai

try:
    from pymongo import MongoClient
except Exception:
    MongoClient = None

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-flash-latest')
    print("✅ Gemini API configured successfully")
else:
    gemini_model = None
    print("⚠️  Gemini API key not found - fallback disabled")


def get_env_float(name, default):
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def get_env_bool(name, default):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in ('1', 'true', 'yes', 'y', 'on')


def get_env_int(name, default):
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


LLM_ENABLED = get_env_bool('LLM_ENABLED', True)
LLM_MIN_CONFIDENCE = get_env_float('LLM_MIN_CONFIDENCE', 0.15)
LLM_BLEND_ALPHA = min(max(get_env_float('LLM_BLEND_ALPHA', 0.6), 0.0), 1.0)
LLM_TIMEOUT_SECONDS = get_env_float('LLM_TIMEOUT_SECONDS', 8.0)

DEEP_ENABLED = get_env_bool('DEEP_ENABLED', True)
DEEP_MIN_CONFIDENCE = get_env_float('DEEP_MIN_CONFIDENCE', 0.15)
DEEP_BLEND_ALPHA = min(max(get_env_float('DEEP_BLEND_ALPHA', 0.25), 0.0), 1.0)
DEEP_LEARNING_RATE = get_env_float('DEEP_LEARNING_RATE', 0.03)
DEEP_EPOCHS = max(1, get_env_int('DEEP_EPOCHS', 18))
DEEP_STATE_PATH = os.environ.get('DEEP_STATE_PATH', 'deep_model_state.json')

MONGODB_URI = os.environ.get('MONGODB_URI', '').strip()
MONGODB_DB_NAME = os.environ.get('MONGODB_DB_NAME', 'servpro_ai').strip() or 'servpro_ai'
MONGODB_CONNECT_TIMEOUT_MS = max(500, get_env_int('MONGODB_CONNECT_TIMEOUT_MS', 3000))


def init_mongo():
    if not MONGODB_URI:
        print("⚠️ MongoDB URI not set - using file-only persistence")
        return {
            'enabled': False,
            'client': None,
            'db': None,
            'models': None,
            'feedback': None
        }

    if MongoClient is None:
        print("⚠️ pymongo is not available - using file-only persistence")
        return {
            'enabled': False,
            'client': None,
            'db': None,
            'models': None,
            'feedback': None
        }

    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=MONGODB_CONNECT_TIMEOUT_MS)
        client.admin.command('ping')
        db = client[MONGODB_DB_NAME]
        models_collection = db['deep_model_states']
        feedback_collection = db['deep_feedback']

        try:
            feedback_collection.create_index('created_at')
            feedback_collection.create_index('expected_service')
        except Exception:
            pass

        print(f"✅ MongoDB connected ({MONGODB_DB_NAME})")
        return {
            'enabled': True,
            'client': client,
            'db': db,
            'models': models_collection,
            'feedback': feedback_collection
        }
    except Exception as exc:
        print(f"⚠️ MongoDB unavailable - using file-only persistence: {exc}")
        return {
            'enabled': False,
            'client': None,
            'db': None,
            'models': None,
            'feedback': None
        }


MONGO_CONTEXT = init_mongo()
MONGO_ENABLED = bool(MONGO_CONTEXT.get('enabled'))
MONGO_MODELS_COLLECTION = MONGO_CONTEXT.get('models')
MONGO_FEEDBACK_COLLECTION = MONGO_CONTEXT.get('feedback')

# Service keywords database
SERVICES_DB = {
    'plomberie': {
        'keywords': ['plumber', 'plumbing', 'water', 'leak', 'pipe', 'faucet', 'drain', 'sink', 'toilet', 'سباك', 'سباكة', 'تسرب', 'أنبوب', 'حنفية', 'مرحاض'],
        'service_name': 'Plumbing',
        'category': 'PLOMBERIE',
        'confidence_threshold': 0.08
    },
    'electricite': {
        'keywords': ['electrician', 'electrical', 'wire', 'circuit', 'power', 'light', 'breaker', 'socket', 'switch', 'кухня', 'كهرباء', 'كهربائي', 'أسلاك', 'مقبس', 'ضوء', 'مفتاح'],
        'service_name': 'Electrical',
        'category': 'ELECTRICITE',
        'confidence_threshold': 0.08
    },
    'climatisation': {
        'keywords': ['ac', 'air conditioner', 'air conditioning', 'hvac', 'cooling', 'heating', 'thermostat', 'temperature', 'hot', 'cold', 'تكييف', 'تبريد', 'تدفئة', 'برودة', 'ثرموستات', 'حرارة'],
        'service_name': 'HVAC',
        'category': 'CLIMATISATION',
        'confidence_threshold': 0.08
    },
    'nettoyage': {
        'keywords': ['cleaning', 'cleaner', 'house cleaning', 'sweep', 'dust', 'wash', 'hygiene', 'clean', 'maid', 'sanitize', 'تنظيف', 'نظافة', 'ممسحة', 'غبار', 'تعقيم'],
        'service_name': 'Cleaning',
        'category': 'NETTOYAGE',
        'confidence_threshold': 0.08
    }
}

ISSUE_PATTERNS = {
    'plomberie': {
        'leak': ['leak', 'water leak', 'تسرب'],
        'drain': ['drain', 'sink', 'pipe', 'clogged', 'blockage', 'أنبوب', 'انسداد'],
        'fixture': ['faucet', 'toilet', 'valve', 'tap', 'حنفية', 'مرحاض']
    },
    'electricite': {
        'power_outage': ['power', 'blackout', 'breaker', 'electricity', 'outage', 'كهرباء', 'انقطاع'],
        'wiring': ['wire', 'wiring', 'circuit', 'socket', 'outlet', 'أسلاك', 'مقبس'],
        'lighting': ['light', 'lamp', 'bulb', 'fixture', 'ضوء', 'مصباح']
    },
    'climatisation': {
        'no_cooling': ['ac', 'air conditioner', 'cooling', 'hvac', 'broken', 'تبريد', 'تكييف', 'معطل'],
        'heating': ['heating', 'warm', 'hot', 'furnace', 'تدفئة', 'حرارة'],
        'thermostat': ['thermostat', 'temperature', 'control', 'ثرموستات']
    },
    'nettoyage': {
        'deep_cleaning': ['deep cleaning', 'cleaning', 'thorough', 'تنظيف', 'نظافة'],
        'dust': ['dust', 'dirt', 'debris', 'غبار', 'أوساخ'],
        'sanitation': ['sanitary', 'hygiene', 'sanitize', 'disinfect', 'تعقيم', 'نظافة']
    }
}

SERVICE_LABEL_ALIASES = {
    'plomberie': 'plomberie',
    'plumbing': 'plomberie',
    'plumber': 'plomberie',
    'سباكة': 'plomberie',
    'electricite': 'electricite',
    'electricity': 'electricite',
    'electrical': 'electricite',
    'كهرباء': 'electricite',
    'climatisation': 'climatisation',
    'hvac': 'climatisation',
    'ac': 'climatisation',
    'air conditioning': 'climatisation',
    'تكييف': 'climatisation',
    'nettoyage': 'nettoyage',
    'cleaning': 'nettoyage',
    'house cleaning': 'nettoyage',
    'تنظيف': 'nettoyage'
}

def normalize_tokens(text):
    """Tokenize and normalize words (including common Arabic prefixes)."""
    raw_tokens = re.findall(r"\w+", text.lower())
    normalized = set()

    for token in raw_tokens:
        if not token:
            continue

        normalized.add(token)

        if token.startswith('و') and len(token) > 2:
            normalized.add(token[1:])

        if token.startswith('ال') and len(token) > 3:
            normalized.add(token[2:])

        if token.startswith('وال') and len(token) > 4:
            normalized.add(token[3:])

    return list(normalized)


def normalize_service_label(label):
    if not label:
        return None
    key = str(label).strip().lower()
    return SERVICE_LABEL_ALIASES.get(key, key if key in SERVICES_DB else None)


def extract_json_object(raw_text):
    """Extract a JSON object from plain text or fenced markdown."""
    if not raw_text:
        return None

    cleaned = raw_text.strip()
    if cleaned.startswith('```'):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s*```$', '', cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to parse the first object-like section.
    match = re.search(r'\{[\s\S]*\}', cleaned)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def llm_nlp_classify(user_input, language='en'):
    """Use Gemini to perform structured NLP classification for service routing."""
    llm_result = {
        'enabled': bool(LLM_ENABLED and gemini_model),
        'used': False,
        'detected_service': None,
        'confidence': 0.0,
        'issue_type': 'general',
        'service_scores': {},
        'assistant_message': None
    }

    if not LLM_ENABLED:
        return llm_result
    if not gemini_model:
        return llm_result

    service_catalog = []
    for key, data in SERVICES_DB.items():
        service_catalog.append(f"- {key}: {data['service_name']} ({data['category']})")

    prompt = f"""You are an NLP classifier for a home services chatbot.
Return ONLY strict JSON, no markdown.

Allowed services:
{chr(10).join(service_catalog)}

Input language hint: {language}
User input: \"{user_input}\"

Output JSON schema:
{{
  "detected_service": "plomberie|electricite|climatisation|nettoyage|null",
  "confidence": 0.0,
  "issue_type": "short_label",
  "service_scores": {{
    "plomberie": 0.0,
    "electricite": 0.0,
    "climatisation": 0.0,
    "nettoyage": 0.0
  }},
  "assistant_message": "2-3 sentence helpful routing advice in the same language as user"
}}

Rules:
- confidence and all service_scores must be between 0 and 1.
- detected_service must be null when no service is reliable.
- Keep assistant_message concise and professional.
"""

    try:
        response = gemini_model.generate_content(
            prompt,
            request_options={"timeout": LLM_TIMEOUT_SECONDS}
        )
        if not response:
            return llm_result

        text = response.text.strip() if hasattr(response, 'text') and response.text else ''
        payload = extract_json_object(text)
        if not payload or not isinstance(payload, dict):
            return llm_result

        llm_service = normalize_service_label(payload.get('detected_service'))
        confidence = payload.get('confidence', 0.0)
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))

        service_scores = payload.get('service_scores', {})
        normalized_scores = {}
        if isinstance(service_scores, dict):
            for service_key in SERVICES_DB.keys():
                score = service_scores.get(service_key, 0.0)
                try:
                    score = float(score)
                except (TypeError, ValueError):
                    score = 0.0
                normalized_scores[service_key] = max(0.0, min(1.0, score))
        else:
            normalized_scores = dict.fromkeys(SERVICES_DB.keys(), 0.0)

        if llm_service and normalized_scores.get(llm_service, 0.0) < 1e-9:
            normalized_scores[llm_service] = confidence

        llm_result.update({
            'used': True,
            'detected_service': llm_service,
            'confidence': confidence,
            'issue_type': str(payload.get('issue_type', 'general') or 'general').strip().lower(),
            'service_scores': normalized_scores,
            'assistant_message': str(payload.get('assistant_message', '')).strip() or None
        })
        return llm_result
    except Exception as e:
        print(f"⚠️ LLM classification failed: {e}")
        return llm_result


def merge_tfidf_llm_scores(tfidf_result, llm_result):
    """Blend TF-IDF scores with LLM scores and return final routing decision."""
    merged = {
        'detected_service': tfidf_result.get('detected_service'),
        'confidence': float(tfidf_result.get('confidence', 0.0) or 0.0),
        'all_scores': tfidf_result.get('all_scores', {}),
        'source': 'tfidf'
    }

    if not llm_result.get('used'):
        return merged

    best_service = None
    best_score = 0.0

    for service_key, score_data in merged['all_scores'].items():
        tfidf_score = float(score_data.get('similarity', 0.0) or 0.0)
        llm_score = float(llm_result.get('service_scores', {}).get(service_key, 0.0) or 0.0)
        combined = (LLM_BLEND_ALPHA * tfidf_score) + ((1.0 - LLM_BLEND_ALPHA) * llm_score)

        score_data['llm_score'] = llm_score
        score_data['combined_score'] = combined

        if combined > best_score:
            best_score = combined
            best_service = service_key

    if best_service and best_score >= SERVICES_DB[best_service]['confidence_threshold']:
        merged['detected_service'] = best_service
        merged['confidence'] = best_score
        merged['source'] = 'hybrid_tfidf_llm'

    # If blended score is low but LLM is confident, trust LLM when above minimum.
    llm_service = llm_result.get('detected_service')
    llm_confidence = float(llm_result.get('confidence', 0.0) or 0.0)
    if llm_service and llm_confidence >= LLM_MIN_CONFIDENCE and llm_confidence > merged['confidence']:
        merged['detected_service'] = llm_service
        merged['confidence'] = llm_confidence
        merged['source'] = 'llm'

    return merged


class DeepServiceClassifier:
    """Small feed-forward neural classifier (pure Python) with online updates."""

    def __init__(self, service_db, state_path='deep_model_state.json', mongo_models_collection=None, mongo_feedback_collection=None):
        self.service_db = service_db
        self.state_path = state_path
        self.mongo_models_collection = mongo_models_collection
        self.mongo_feedback_collection = mongo_feedback_collection
        self.mongo_model_key = 'deep_service_model_v1'
        self.labels = list(service_db.keys())
        self.label_to_idx = {label: i for i, label in enumerate(self.labels)}
        self.idx_to_label = {i: label for label, i in self.label_to_idx.items()}

        self.vocab = {}
        self.hidden_1 = 48
        self.hidden_2 = 24
        self.random = random.Random(42)

        self.w1 = []
        self.b1 = []
        self.w2 = []
        self.b2 = []
        self.w3 = []
        self.b3 = []

        self.is_ready = False
        self._bootstrap()

    def _bootstrap(self):
        if self._load_state():
            self.is_ready = True
            print("✅ Deep model loaded from persisted state")
            return

        training_samples = self._build_seed_training_samples()
        training_samples.extend(self._load_feedback_samples(limit=2000))
        if not training_samples:
            return

        self._build_vocab([text for text, _ in training_samples])
        self._initialize_weights()
        self._fit(training_samples, epochs=DEEP_EPOCHS, lr=DEEP_LEARNING_RATE)
        self.is_ready = True
        self._save_state()
        print(f"✅ Deep model initialized with {len(training_samples)} seed samples")

    def _load_feedback_samples(self, limit=2000):
        if not self.mongo_feedback_collection:
            return []

        try:
            cursor = self.mongo_feedback_collection.find(
                {
                    'text': {'$exists': True},
                    'expected_service': {'$in': self.labels}
                },
                {'text': 1, 'expected_service': 1, '_id': 0}
            ).sort('created_at', -1).limit(max(1, limit))

            samples = []
            for doc in cursor:
                text = str(doc.get('text', '')).strip()
                expected_service = str(doc.get('expected_service', '')).strip()
                if text and expected_service in self.label_to_idx:
                    samples.append((text, expected_service))
            return samples
        except Exception as exc:
            print(f"⚠️ Could not load feedback samples from MongoDB: {exc}")
            return []

    def _build_seed_training_samples(self):
        templates_en = [
            "i need {kw}",
            "can you help with {kw}",
            "urgent {kw} issue",
            "please fix {kw}",
            "book service for {kw}"
        ]
        templates_ar = [
            "أحتاج {kw}",
            "عندي مشكلة {kw}",
            "مطلوب خدمة {kw}",
            "من فضلك أصلح {kw}",
            "احجز لي {kw}"
        ]

        samples = []
        for service_key, service_data in self.service_db.items():
            keywords = service_data.get('keywords', [])
            for kw in keywords:
                cleaned_kw = str(kw).strip()
                if not cleaned_kw:
                    continue
                samples.append((cleaned_kw, service_key))
                for tpl in templates_en:
                    samples.append((tpl.format(kw=cleaned_kw), service_key))
                for tpl in templates_ar:
                    samples.append((tpl.format(kw=cleaned_kw), service_key))

        return samples

    def _build_vocab(self, texts):
        token_counts = Counter()
        for text in texts:
            tokens = normalize_tokens(text)
            token_counts.update(tokens)

        kept_tokens = [token for token, count in token_counts.items() if count >= 1]
        self.vocab = {token: idx for idx, token in enumerate(sorted(kept_tokens))}

    def _initialize_weights(self):
        in_dim = len(self.vocab)
        out_dim = len(self.labels)

        def rand_weight(scale=0.05):
            return self.random.uniform(-scale, scale)

        self.w1 = [[rand_weight() for _ in range(in_dim)] for _ in range(self.hidden_1)]
        self.b1 = [0.0 for _ in range(self.hidden_1)]

        self.w2 = [[rand_weight() for _ in range(self.hidden_1)] for _ in range(self.hidden_2)]
        self.b2 = [0.0 for _ in range(self.hidden_2)]

        self.w3 = [[rand_weight() for _ in range(self.hidden_2)] for _ in range(out_dim)]
        self.b3 = [0.0 for _ in range(out_dim)]

    def _vectorize(self, text):
        vector = {}
        tokens = normalize_tokens(text)
        for token in tokens:
            idx = self.vocab.get(token)
            if idx is not None:
                vector[idx] = vector.get(idx, 0.0) + 1.0

        norm = math.sqrt(sum(v * v for v in vector.values()))
        if norm > 0:
            for idx in list(vector.keys()):
                vector[idx] /= norm
        return vector

    def _relu(self, values):
        return [v if v > 0 else 0.0 for v in values]

    def _softmax(self, logits):
        if not logits:
            return []
        max_logit = max(logits)
        exps = [math.exp(v - max_logit) for v in logits]
        total = sum(exps)
        if total <= 0:
            return [0.0 for _ in logits]
        return [v / total for v in exps]

    def _forward(self, sparse_x):
        z1 = []
        for i in range(self.hidden_1):
            value = self.b1[i]
            row = self.w1[i]
            for idx, x in sparse_x.items():
                value += row[idx] * x
            z1.append(value)
        a1 = self._relu(z1)

        z2 = []
        for i in range(self.hidden_2):
            value = self.b2[i]
            row = self.w2[i]
            for j, a in enumerate(a1):
                value += row[j] * a
            z2.append(value)
        a2 = self._relu(z2)

        z3 = []
        for i in range(len(self.labels)):
            value = self.b3[i]
            row = self.w3[i]
            for j, a in enumerate(a2):
                value += row[j] * a
            z3.append(value)
        probs = self._softmax(z3)

        cache = {
            'x': sparse_x,
            'z1': z1,
            'a1': a1,
            'z2': z2,
            'a2': a2,
            'probs': probs
        }
        return probs, cache

    def _train_step(self, text, label, lr):
        y_idx = self.label_to_idx.get(label)
        if y_idx is None:
            return

        x = self._vectorize(text)
        if not x:
            return

        probs, cache = self._forward(x)
        if not probs:
            return

        a1 = cache['a1']
        a2 = cache['a2']
        z1 = cache['z1']
        z2 = cache['z2']

        dz3 = list(probs)
        dz3[y_idx] -= 1.0

        da2 = [0.0 for _ in range(self.hidden_2)]
        for o in range(len(self.labels)):
            grad = dz3[o]
            self.b3[o] -= lr * grad
            for j in range(self.hidden_2):
                da2[j] += self.w3[o][j] * grad
                self.w3[o][j] -= lr * (grad * a2[j])

        dz2 = [da2[i] if z2[i] > 0 else 0.0 for i in range(self.hidden_2)]
        da1 = [0.0 for _ in range(self.hidden_1)]
        for i in range(self.hidden_2):
            grad = dz2[i]
            self.b2[i] -= lr * grad
            for j in range(self.hidden_1):
                da1[j] += self.w2[i][j] * grad
                self.w2[i][j] -= lr * (grad * a1[j])

        dz1 = [da1[i] if z1[i] > 0 else 0.0 for i in range(self.hidden_1)]
        for i in range(self.hidden_1):
            grad = dz1[i]
            self.b1[i] -= lr * grad
            row = self.w1[i]
            for idx, x_val in x.items():
                row[idx] -= lr * (grad * x_val)

    def _fit(self, samples, epochs=12, lr=0.03):
        if not samples:
            return
        for _ in range(max(1, epochs)):
            self.random.shuffle(samples)
            for text, label in samples:
                self._train_step(text, label, lr)

    def predict(self, text):
        if not self.is_ready:
            return None, 0.0, dict.fromkeys(self.labels, 0.0)

        x = self._vectorize(text)
        if not x:
            return None, 0.0, dict.fromkeys(self.labels, 0.0)

        probs, _ = self._forward(x)
        if not probs:
            return None, 0.0, dict.fromkeys(self.labels, 0.0)

        best_idx = max(range(len(probs)), key=lambda i: probs[i])
        best_label = self.idx_to_label.get(best_idx)
        best_conf = float(probs[best_idx])
        scores = {self.idx_to_label[i]: float(probs[i]) for i in range(len(probs))}
        return best_label, best_conf, scores

    def train_online(self, text, expected_service, epochs=4, lr=None):
        if expected_service not in self.label_to_idx:
            return False
        if lr is None:
            lr = DEEP_LEARNING_RATE

        if not self.is_ready:
            self._build_vocab([text])
            self._initialize_weights()
            self.is_ready = True

        train_samples = [(text, expected_service) for _ in range(max(1, epochs))]
        self._fit(train_samples, epochs=1, lr=lr)
        self._save_state()
        return True

    def _save_state(self):
        payload = {
            'labels': self.labels,
            'vocab': self.vocab,
            'hidden_1': self.hidden_1,
            'hidden_2': self.hidden_2,
            'w1': self.w1,
            'b1': self.b1,
            'w2': self.w2,
            'b2': self.b2,
            'w3': self.w3,
            'b3': self.b3
        }

        if self.mongo_models_collection is not None:
            try:
                self.mongo_models_collection.update_one(
                    {'_id': self.mongo_model_key},
                    {
                        '$set': {
                            'state': payload,
                            'updated_at': datetime.utcnow()
                        }
                    },
                    upsert=True
                )
            except Exception as exc:
                print(f"⚠️ Could not save deep model state to MongoDB: {exc}")

        try:
            with open(self.state_path, 'w', encoding='utf-8') as f:
                json.dump(payload, f)
        except Exception as exc:
            print(f"⚠️ Could not save deep model state: {exc}")

    def _load_state(self):
        if self.mongo_models_collection is not None:
            try:
                document = self.mongo_models_collection.find_one({'_id': self.mongo_model_key})
                payload = document.get('state') if document else None
                if payload and self._apply_state(payload):
                    return True
            except Exception as exc:
                print(f"⚠️ Could not load deep model state from MongoDB: {exc}")

        if not os.path.exists(self.state_path):
            return False
        try:
            with open(self.state_path, 'r', encoding='utf-8') as f:
                payload = json.load(f)

            return self._apply_state(payload)
        except Exception as exc:
            print(f"⚠️ Could not load deep model state: {exc}")
            return False

    def _apply_state(self, payload):
        try:
            if payload.get('labels') != self.labels:
                return False

            self.vocab = payload.get('vocab', {})
            self.hidden_1 = int(payload.get('hidden_1', self.hidden_1))
            self.hidden_2 = int(payload.get('hidden_2', self.hidden_2))
            self.w1 = payload.get('w1', [])
            self.b1 = payload.get('b1', [])
            self.w2 = payload.get('w2', [])
            self.b2 = payload.get('b2', [])
            self.w3 = payload.get('w3', [])
            self.b3 = payload.get('b3', [])

            if not self.vocab or not self.w1 or not self.w2 or not self.w3:
                return False

            return True
        except Exception as exc:
            print(f"⚠️ Could not apply deep model state: {exc}")
            return False


def deep_nlp_classify(user_input):
    deep_result = {
        'enabled': bool(DEEP_ENABLED and deep_classifier and deep_classifier.is_ready),
        'used': False,
        'detected_service': None,
        'confidence': 0.0,
        'service_scores': {}
    }

    if not DEEP_ENABLED or not deep_classifier or not deep_classifier.is_ready:
        return deep_result

    try:
        label, confidence, scores = deep_classifier.predict(user_input)
        deep_result['used'] = True
        deep_result['service_scores'] = scores
        if label and confidence >= DEEP_MIN_CONFIDENCE:
            deep_result['detected_service'] = label
            deep_result['confidence'] = confidence
        return deep_result
    except Exception as exc:
        print(f"⚠️ Deep classification failed: {exc}")
        return deep_result


def merge_with_deep_scores(merged_result, deep_result):
    if not deep_result.get('used'):
        return merged_result

    best_service = None
    best_score = 0.0

    for service_key, score_data in merged_result.get('all_scores', {}).items():
        base_score = float(score_data.get('combined_score', score_data.get('similarity', 0.0)) or 0.0)
        deep_score = float(deep_result.get('service_scores', {}).get(service_key, 0.0) or 0.0)
        final_score = ((1.0 - DEEP_BLEND_ALPHA) * base_score) + (DEEP_BLEND_ALPHA * deep_score)

        score_data['deep_score'] = deep_score
        score_data['final_score'] = final_score

        if final_score > best_score:
            best_score = final_score
            best_service = service_key

    if best_service and best_score >= SERVICES_DB[best_service]['confidence_threshold']:
        merged_result['detected_service'] = best_service
        merged_result['confidence'] = best_score
        merged_result['source'] = 'hybrid_tfidf_llm_deep'

    deep_service = deep_result.get('detected_service')
    deep_confidence = float(deep_result.get('confidence', 0.0) or 0.0)
    if deep_service and deep_confidence >= DEEP_MIN_CONFIDENCE and deep_confidence > merged_result.get('confidence', 0.0):
        merged_result['detected_service'] = deep_service
        merged_result['confidence'] = deep_confidence
        merged_result['source'] = 'deep'

    return merged_result

class SimpleVectorizer:
    """Lightweight TF-IDF vectorizer without scikit-learn dependency"""
    
    def __init__(self):
        self.vocab = {}
        self.idf_values = {}
        self.n_docs = 0
        
    def build_vocab(self, texts):
        """Build vocabulary from documents"""
        for text in texts:
            words = set(normalize_tokens(text))
            for word in words:
                self.vocab[word] = self.vocab.get(word, 0) + 1
    
    def calculate_idf(self, texts):
        """Calculate IDF values"""
        self.n_docs = len(texts)
        doc_word_count = {}
        
        for text in texts:
            words = set(normalize_tokens(text))
            for word in words:
                doc_word_count[word] = doc_word_count.get(word, 0) + 1
        
        for word, count in doc_word_count.items():
            self.idf_values[word] = math.log(self.n_docs / (1 + count))
    
    def get_tf_idf(self, text):
        """Get TF-IDF vector for text"""
        words = normalize_tokens(text)
        word_count = Counter(words)
        
        # Calculate TF (term frequency)
        tf = {}
        for word, count in word_count.items():
            tf[word] = count / len(words) if words else 0
        
        # Calculate TF-IDF
        tfidf = {}
        for word in set(words):
            idf = self.idf_values.get(word, 1)
            tfidf[word] = tf.get(word, 0) * idf
        
        return tfidf
    
    def cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors"""
        all_words = set(vec1.keys()) | set(vec2.keys())
        
        if not all_words:
            return 0.0
        
        dot_product = sum(vec1.get(word, 0) * vec2.get(word, 0) for word in all_words)
        
        norm1 = math.sqrt(sum(v**2 for v in vec1.values()))
        norm2 = math.sqrt(sum(v**2 for v in vec2.values()))
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)

class ServiceRecommender:
    def __init__(self):
        self.vectorizer = SimpleVectorizer()
        self.service_keywords = SERVICES_DB
        self.service_vectors = {}
        self.service_keyword_sets = {}
        self.fit_vectorizer()

    def tokenize(self, text):
        """Normalize and tokenize text."""
        return normalize_tokens(text)

    def fit_vectorizer(self):
        """Build vocabulary and calculate IDF"""
        # Combine all keywords into documents
        all_docs = []
        for service_key, service_data in self.service_keywords.items():
            doc = ' '.join(service_data['keywords'])
            all_docs.append(doc)
            # Cache service vector
            self.service_vectors[service_key] = doc
            self.service_keyword_sets[service_key] = set(self.tokenize(doc))
        
        # Also add common terms
        common_terms_doc = 'need help problem fix install service repair urgent broken maintain'
        all_docs.append(common_terms_doc)
        
        self.vectorizer.build_vocab(all_docs)
        self.vectorizer.calculate_idf(all_docs)

    def recommend_service(self, user_input):
        """Recommend service based on user input"""
        user_vec = self.vectorizer.get_tf_idf(user_input)
        user_tokens = set(self.tokenize(user_input))
        
        best_service = None
        best_confidence = 0
        scores = {}
        
        for service_key, service_keyword_str in self.service_vectors.items():
            service_vec = self.vectorizer.get_tf_idf(service_keyword_str)
            
            # Calculate cosine similarity
            cosine_score = self.vectorizer.cosine_similarity(user_vec, service_vec)
            keyword_set = self.service_keyword_sets.get(service_key, set())
            matched_keywords = sorted(user_tokens & keyword_set)
            keyword_score = len(matched_keywords) / max(len(user_tokens), 1)
            similarity = (0.6 * cosine_score) + (0.4 * keyword_score)
            
            service_data = self.service_keywords[service_key]
            scores[service_key] = {
                'similarity': float(similarity),
                'cosine_score': float(cosine_score),
                'keyword_score': float(keyword_score),
                'matched_keywords': matched_keywords,
                'service_name': service_data['service_name'],
                'category': service_data['category']
            }
            
            if similarity > best_confidence and similarity >= service_data['confidence_threshold']:
                best_confidence = similarity
                best_service = service_key
        
        return {
            'detected_service': best_service,
            'confidence': float(best_confidence),
            'all_scores': scores,
            'service_data': self.service_keywords.get(best_service) if best_service else None
        }

# Initialize recommender
recommender = ServiceRecommender()
deep_classifier = DeepServiceClassifier(
    SERVICES_DB,
    state_path=DEEP_STATE_PATH,
    mongo_models_collection=MONGO_MODELS_COLLECTION,
    mongo_feedback_collection=MONGO_FEEDBACK_COLLECTION
)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'AI Chatbot service is running',
        'model': 'Hybrid NLP: TF-IDF + LLM (Gemini) + Deep NN',
        'version': '1.2.0',
        'llm_enabled': bool(LLM_ENABLED and gemini_model),
        'llm_blend_alpha': LLM_BLEND_ALPHA,
        'deep_enabled': bool(DEEP_ENABLED and deep_classifier and deep_classifier.is_ready),
        'deep_blend_alpha': DEEP_BLEND_ALPHA,
        'mongodb_enabled': MONGO_ENABLED,
        'mongodb_database': MONGODB_DB_NAME if MONGO_ENABLED else None
    }), 200

@app.route('/services', methods=['GET'])
def list_services():
    """List all available services in the system"""
    language = request.args.get('language', 'en')
    
    services_list = []
    for service_key, service_data in SERVICES_DB.items():
        services_list.append({
            'key': service_key,
            'name': service_data['service_name'],
            'category': service_data['category'],
            'keywords': service_data['keywords'][:5]  # Return top 5 keywords
        })
    
    if language == 'ar':
        response_text = "الخدمات المتاحة لدينا هي:"
    else:
        response_text = "Our available services are:"
    
    return jsonify({
        'services': services_list,
        'message': response_text,
        'language': language,
        'count': len(services_list)
    }), 200

@app.route('/recommend', methods=['POST'])
def recommend():
    """
    Recommend service based on user input
    Expected JSON: {"text": "user message", "language": "en" or "ar"}
    """
    language = 'en'
    try:
        data = request.get_json()
        user_input = data.get('text', '').strip()
        language = data.get('language', 'en')
        
        if not user_input:
            return jsonify({
                'error': 'Empty input',
                'message': 'الرجاء توفير نص' if language == 'ar' else 'Please provide some text'
            }), 400
        
        # Check if user is asking for service list/information (generic query)
        generic_service_keywords = [
            'what', 'which', 'list', 'all', 'services', 'offer', 'provide', 'have', 'available', 'what are',
            'ماذا', 'قائمة', 'خدمات', 'كل', 'توفيرون', 'تقدمون', 'لديكم', 'المتاحة'
        ]
        user_tokens = set(normalize_tokens(user_input))
        generic_count = len(user_tokens & set(generic_service_keywords))
        
        # If query looks like asking for service list (has multiple generic terms)
        if generic_count >= 2 and user_input.lower().count('?') > 0:
            # Return list of services instead of trying to match
            services_list = []
            for service_key, service_data in SERVICES_DB.items():
                services_list.append(service_data['service_name'])
            
            if language == 'ar':
                services_str = '، '.join(services_list)
                message = f"الخدمات المتاحة لدينا هي: {services_str}. أي خدمة تحتاج؟"
            else:
                services_str = ', '.join(services_list)
                message = f"Our available services are: {services_str}. Which one do you need?"
            
            return jsonify({
                'user_input': user_input,
                'detected_service': None,
                'confidence': 0.0,
                'language': language,
                'message': message,
                'recommendations': [],
                'source': 'services_list',
                'fallback_used': False,
                'all_scores': {}
            }), 200
        
        # Get baseline NLP recommendation then blend with structured LLM and deep model classification.
        tfidf_result = recommender.recommend_service(user_input)
        llm_result = llm_nlp_classify(user_input, language)
        result = merge_tfidf_llm_scores(tfidf_result, llm_result)
        deep_result = deep_nlp_classify(user_input)
        result = merge_with_deep_scores(result, deep_result)
        
        # Prepare response
        response = {
            'user_input': user_input,
            'detected_service': result['detected_service'],
            'confidence': result['confidence'],
            'language': language,
            'recommendations': []
        }
        
        if result['detected_service'] and result['confidence'] > 0:
            service_data = SERVICES_DB.get(result['detected_service'])
            best_score = result['all_scores'].get(result['detected_service'], {})
            matched_keywords = best_score.get('matched_keywords', [])
            issue_type = llm_result.get('issue_type') if llm_result.get('used') else detect_issue_type(result['detected_service'], user_input)
            if not issue_type or issue_type == 'general':
                issue_type = detect_issue_type(result['detected_service'], user_input)

            recommendation_message = llm_result.get('assistant_message') if llm_result.get('used') else None
            if not recommendation_message:
                recommendation_message = generate_response(
                    result['detected_service'],
                    language,
                    issue_type
                )

            response['recommendations'].append({
                'service_name': service_data['service_name'],
                'category': service_data['category'],
                'confidence': result['confidence'],
                'matched_keywords': matched_keywords,
                'issue_type': issue_type,
                'message': recommendation_message
            })
            response['message'] = response['recommendations'][0]['message']
        else:
            # Use Gemini API for fallback when confidence is too low
            gemini_response = generate_gemini_response(user_input, language, result['confidence'])
            response['message'] = gemini_response
            response['suggestions'] = [s['service_name'] for s in SERVICES_DB.values()]
            response['source'] = 'gemini_fallback'
            response['fallback_used'] = True
        
        response['all_scores'] = result['all_scores']
        response['llm_used'] = bool(llm_result.get('used'))
        response['deep_used'] = bool(deep_result.get('used'))
        
        # Add source metadata
        if 'source' not in response:
            response['source'] = result.get('source', 'tfidf')
            response['fallback_used'] = False
        
        return jsonify(response), 200

    except Exception as e:
        print(f"❌ Error in /recommend endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'حدث خطأ في معالجة طلبك' if language == 'ar' else 'An error occurred processing your request',
            'suggestions': [s['service_name'] for s in SERVICES_DB.values()]
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Detailed analysis of user input
    Returns confidence scores for all services
    """
    try:
        data = request.get_json()
        user_input = data.get('text', '').strip()
        language = data.get('language', 'en')
        
        if not user_input:
            return jsonify({'error': 'Empty input'}), 400
        
        tfidf_result = recommender.recommend_service(user_input)
        llm_result = llm_nlp_classify(user_input, language)
        result = merge_tfidf_llm_scores(tfidf_result, llm_result)
        deep_result = deep_nlp_classify(user_input)
        result = merge_with_deep_scores(result, deep_result)
        
        return jsonify({
            'user_input': user_input,
            'language': language,
            'scores': result['all_scores'],
            'best_match': {
                'service': result['detected_service'],
                'confidence': result['confidence']
            },
            'source': result.get('source', 'tfidf'),
            'llm_used': bool(llm_result.get('used')),
            'deep_used': bool(deep_result.get('used'))
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/feedback', methods=['POST'])
def feedback():
    """
    Online learning endpoint for the deep classifier.
    Expected JSON: {"text": "...", "expected_service": "plomberie|electricite|climatisation|nettoyage", "epochs": 4}
    """
    try:
        data = request.get_json() or {}
        user_input = str(data.get('text', '')).strip()
        expected_service = normalize_service_label(data.get('expected_service'))
        epochs = data.get('epochs', 4)

        try:
            epochs = int(epochs)
        except (TypeError, ValueError):
            epochs = 4

        if not user_input:
            return jsonify({'error': 'Empty input'}), 400

        if expected_service not in SERVICES_DB:
            return jsonify({'error': 'Invalid expected_service', 'allowed': list(SERVICES_DB.keys())}), 400

        if not DEEP_ENABLED or not deep_classifier:
            return jsonify({'error': 'Deep model is disabled'}), 400

        trained = deep_classifier.train_online(
            text=user_input,
            expected_service=expected_service,
            epochs=max(1, min(20, epochs)),
            lr=DEEP_LEARNING_RATE
        )

        if not trained:
            return jsonify({'error': 'Online training failed'}), 500

        feedback_saved = False
        if MONGO_FEEDBACK_COLLECTION is not None:
            try:
                MONGO_FEEDBACK_COLLECTION.insert_one({
                    'text': user_input,
                    'expected_service': expected_service,
                    'epochs': max(1, min(20, epochs)),
                    'created_at': datetime.utcnow()
                })
                feedback_saved = True
            except Exception as exc:
                print(f"⚠️ Could not store feedback sample: {exc}")

        predicted_service, confidence, scores = deep_classifier.predict(user_input)
        return jsonify({
            'status': 'updated',
            'expected_service': expected_service,
            'predicted_service': predicted_service,
            'confidence': confidence,
            'scores': scores,
            'feedback_saved': feedback_saved
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def detect_issue_type(service_key, user_input):
    """Detect issue subtype for more precise advice."""
    tokens = set(normalize_tokens(user_input))
    service_patterns = ISSUE_PATTERNS.get(service_key, {})

    best_type = 'general'
    best_hits = 0

    for issue_type, keywords in service_patterns.items():
        keyword_tokens = set()
        for keyword in keywords:
            keyword_tokens.update(normalize_tokens(keyword))

        hits = len(tokens & keyword_tokens)
        if hits > best_hits:
            best_hits = hits
            best_type = issue_type

    return best_type

def generate_response(service_key, language='en', issue_type='general'):
    """Generate an accurate, actionable response message."""

    english_advice = {
        'plomberie': {
            'leak': "This looks like a leak issue. Turn off the nearest water valve if leakage is active, then book a plumber for inspection.",
            'drain': "This sounds like a drain or pipe blockage. Avoid chemical overuse and schedule a plumbing cleaning/check.",
            'fixture': "This appears to be a faucet/toilet fixture problem. A plumber can repair or replace the faulty part quickly.",
            'general': "This request matches plumbing work. A certified plumber is the right specialist."
        },
        'electricite': {
            'power_outage': "This sounds like an electrical power/breaker issue. For safety, switch off the affected circuit and call an electrician.",
            'wiring': "This looks like a wiring/socket problem. Avoid handling exposed wires and request a certified electrician.",
            'lighting': "This appears related to lighting fixtures. An electrician can diagnose wiring, switch, or fixture faults.",
            'general': "This request matches electrical work. A licensed electrician is recommended."
        },
        'climatisation': {
            'no_cooling': "This looks like an AC cooling issue. Check filter cleanliness and thermostat settings, then schedule HVAC service if needed.",
            'heating': "This seems related to heating/temperature control. HVAC diagnostics are recommended.",
            'thermostat': "This appears to involve thermostat control. A technician can recalibrate or replace the controller.",
            'general': "This request matches HVAC/air-conditioning service."
        },
        'nettoyage': {
            'deep_cleaning': "This sounds like deep-cleaning support. A cleaning team can handle full-room or whole-home cleaning.",
            'dust': "This looks like a dust/dirt cleaning request. Targeted cleaning service is recommended.",
            'sanitation': "This appears to need sanitation/hygiene-focused cleaning. A specialized cleaning service can help.",
            'general': "This request matches cleaning services."
        }
    }

    arabic_advice = {
        'plomberie': {
            'leak': "يبدو أن المشكلة تسرب مياه. أغلق صمام الماء القريب إذا كان التسرب مستمرًا ثم اطلب سباكًا للفحص.",
            'drain': "تبدو المشكلة انسدادًا في الأنبوب أو المصرف. يُفضل طلب سباك لتنظيف وفحص الأنابيب.",
            'fixture': "يبدو أن المشكلة في الحنفية أو المرحاض. يمكن للسباك إصلاح القطعة أو استبدالها بسرعة.",
            'general': "طلبك يطابق خدمات السباكة، والسباك هو الاختصاص المناسب."
        },
        'electricite': {
            'power_outage': "تبدو المشكلة كهربائية (قاطع/انقطاع). للسلامة أوقف الدائرة المتأثرة واطلب كهربائيًا.",
            'wiring': "تبدو المشكلة في الأسلاك أو المقبس. تجنب لمس الأسلاك المكشوفة واطلب كهربائيًا معتمدًا.",
            'lighting': "تبدو المشكلة مرتبطة بالإضاءة. يستطيع الكهربائي فحص التوصيلات والمفتاح والمصباح.",
            'general': "طلبك يطابق الخدمات الكهربائية، والكهربائي هو الأنسب."
        },
        'climatisation': {
            'no_cooling': "تبدو المشكلة في تبريد المكيف. تحقق من الفلتر والثرموستات ثم احجز فني تكييف عند الحاجة.",
            'heating': "تبدو المشكلة مرتبطة بالتدفئة أو التحكم بالحرارة. يُنصح بفحص فني تكييف.",
            'thermostat': "تبدو المشكلة في الثرموستات. يمكن للفني إعادة ضبطه أو استبداله.",
            'general': "طلبك يطابق خدمة التكييف والتبريد."
        },
        'nettoyage': {
            'deep_cleaning': "يبدو أنك تحتاج تنظيفًا عميقًا. فريق التنظيف يمكنه التعامل مع تنظيف شامل.",
            'dust': "تبدو المشكلة مرتبطة بالغبار/الأوساخ. يوصى بخدمة تنظيف موجهة.",
            'sanitation': "يبدو أنك تحتاج تنظيفًا وتعقيمًا صحيًا. خدمة تنظيف متخصصة مناسبة.",
            'general': "طلبك يطابق خدمات التنظيف."
        }
    }

    advice_map = arabic_advice if language == 'ar' else english_advice
    service_advice = advice_map.get(service_key, {})
    advice = service_advice.get(issue_type, service_advice.get('general', 'Service found.'))

    if language == 'ar':
        return f" {advice} "
    
    return f" {advice}"

def generate_gemini_response(user_input, language='en', confidence=0.0):
    """
    Generate response using Google Gemini API when confidence is low.
    Provides contextual, professional, and optimistic responses for on-demand services.
    """
    if not gemini_model:
        if language == 'ar':
            return "عذرًا، لم أتمكن من فهم طلبك بدقة. يرجى توضيح الخدمة التي تحتاجها (سباكة، كهرباء، تكييف، تنظيف)."
        return "I couldn't determine the specific service you need with confidence. Could you please clarify if you need plumbing, electrical, HVAC, or cleaning services?"
    
    try:
        # Craft a professional prompt for on-demand services context
        if language == 'ar':
            system_prompt = f"""أنت مساعد ذكي محترف ومتفائل لمنصة خدمات منزلية حسب الطلب.
المستخدم قال: "{user_input}"

السياق: نحن نقدم خدمات السباكة، الكهرباء، التكييف والتبريد، والتنظيف.

مهمتك:
1. فهم احتياج المستخدم بشكل إيجابي
2. اقتراح الخدمة الأنسب من (السباكة، الكهرباء، التكييف، التنظيف)
3. تقديم نصيحة عملية قصيرة ومفيدة
4. تشجيع المستخدم على حجز الخدمة

الرد يجب أن يكون:
- محترف وودود
- 2-3 جمل فقط
- متفائل وإيجابي
- يذكر الخدمة المناسبة بوضوح"""
        else:
            system_prompt = f"""You are a professional and optimistic AI assistant for an on-demand home services platform.
User said: "{user_input}"

Context: We provide plumbing, electrical, HVAC (air conditioning/heating), and cleaning services.

Your task:
1. Understand the user's need positively
2. Suggest the most appropriate service from (plumbing, electrical, HVAC, cleaning)
3. Provide concise, actionable advice
4. Encourage the user to book the service

Response should be:
- Professional and friendly
- 2-3 sentences maximum
- Optimistic and positive
- Clearly mention the appropriate service"""

        try:
            response = gemini_model.generate_content(system_prompt, request_options={"timeout": 8})
        except Exception as timeout_error:
            print(f"⚠️ Gemini timeout/request error: {timeout_error}")
            if language == 'ar':
                return "الخدمات المتاحة لدينا: السباكة، الكهرباء، التكييف، والتنظيف. أي منها تحتاج؟"
            return "Our services include: plumbing, electrical, HVAC, and cleaning. Which one do you need?"
        
        # Check if response was blocked
        if not response:
            print("⚠️ Gemini API returned no response")
            if language == 'ar':
                return "يبدو أنك تحتاج خدمة منزلية. يمكنك تصفح خدماتنا (سباكة، كهرباء، تكييف، تنظيف) واختيار الأنسب لك."
            return "It seems you need a home service. You can browse our services (plumbing, electrical, HVAC, cleaning) and choose what fits your need."
        
        # Check if response was blocked by safety filters
        if hasattr(response, 'prompt_feedback') and response.prompt_feedback.block_reason:
            print(f"⚠️ Gemini API blocked response: {response.prompt_feedback.block_reason}")
            if language == 'ar':
                return "يبدو أنك تحتاج خدمة منزلية. يمكنك تصفح خدماتنا (سباكة، كهرباء، تكييف، تنظيف) واختيار الأنسب لك."
            return "It seems you need a home service. You can browse our services (plumbing, electrical, HVAC, cleaning) and choose what fits your need."
        
        # Extract text safely
        try:
            gemini_text = response.text.strip() if hasattr(response, 'text') and response.text else None
        except (ValueError, AttributeError) as text_error:
            print(f"⚠️ Could not extract text from Gemini response: {text_error}")
            gemini_text = None
        
        if gemini_text and len(gemini_text.strip()) > 0:
            return gemini_text
        else:
            # Fallback if Gemini doesn't return valid response
            if language == 'ar':
                return "يبدو أنك تحتاج خدمة منزلية. يمكنك تصفح خدماتنا (سباكة، كهرباء، تكييف، تنظيف) واختيار الأنسب لك."
            return "It seems you need a home service. You can browse our services (plumbing, electrical, HVAC, cleaning) and choose what fits your need."
    
    except Exception as e:
        print(f"❌ Gemini API Error: {str(e)}")
        import traceback
        traceback.print_exc()
        # Graceful fallback
        if language == 'ar':
            return "نعتذر، واجهنا صعوبة في معالجة طلبك. يرجى توضيح الخدمة التي تحتاجها من (سباكة، كهرباء، تكييف، تنظيف)."
        return "We had trouble processing your request. Please specify which service you need from (plumbing, electrical, HVAC, cleaning)."

if __name__ == '__main__':
    # Use platform-assigned port (Render/containers) with local fallback.
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')

    print("🤖 Starting Python AI Chatbot Service...")
    print(f"📍 Python AI Service running on http://{host}:{port}")
    print("   No ML libraries required - Pure Python TF-IDF!")
    app.run(debug=False, host=host, port=port, use_reloader=False)
