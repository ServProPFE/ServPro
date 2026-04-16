from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import Counter
import math
import re
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

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


LLM_ENABLED = get_env_bool('LLM_ENABLED', True)
LLM_MIN_CONFIDENCE = get_env_float('LLM_MIN_CONFIDENCE', 0.15)
LLM_BLEND_ALPHA = min(max(get_env_float('LLM_BLEND_ALPHA', 0.6), 0.0), 1.0)
LLM_TIMEOUT_SECONDS = get_env_float('LLM_TIMEOUT_SECONDS', 8.0)

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

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'AI Chatbot service is running',
        'model': 'Hybrid NLP: TF-IDF + LLM (Gemini)',
        'version': '1.1.0',
        'llm_enabled': bool(LLM_ENABLED and gemini_model),
        'llm_blend_alpha': LLM_BLEND_ALPHA
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
        
        # Get baseline NLP recommendation then blend with structured LLM classification.
        tfidf_result = recommender.recommend_service(user_input)
        llm_result = llm_nlp_classify(user_input, language)
        result = merge_tfidf_llm_scores(tfidf_result, llm_result)
        
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
        
        return jsonify({
            'user_input': user_input,
            'language': language,
            'scores': result['all_scores'],
            'best_match': {
                'service': result['detected_service'],
                'confidence': result['confidence']
            },
            'source': result.get('source', 'tfidf'),
            'llm_used': bool(llm_result.get('used'))
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
