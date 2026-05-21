from flask import Flask, request, jsonify
from flask_cors import CORS
from collections import Counter
import math
import re
import os
import json
import random
from datetime import datetime
from urllib.request import Request, urlopen
from dotenv import load_dotenv

# Lazy import for Gemini - avoid blocking startup
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None

try:
    from pymongo import MongoClient
except Exception:
    MongoClient = None

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration - but don't initialize heavy components yet
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
gemini_model = None  # Will be lazily initialized
gemini_initialized = False


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

AGENT_MODE_ENABLED = get_env_bool('AGENT_MODE_ENABLED', True)
AGENT_MAX_STEPS = max(2, get_env_int('AGENT_MAX_STEPS', 4))
AGENT_CLARIFICATION_THRESHOLD = get_env_float('AGENT_CLARIFICATION_THRESHOLD', 0.25)
EMPTY_INPUT_ERROR = 'Empty input'
EMPTY_INPUT_MESSAGE_EN = 'Please provide some text'
EMPTY_INPUT_MESSAGE_AR = 'الرجاء توفير نص'
AGENT_GENERIC_SERVICE_KEYWORDS = {
    'what', 'which', 'list', 'all', 'services', 'offer', 'provide', 'have', 'available'
}
AGENT_PREFERENCE_TOKEN_ALIASES = {
    'cheapest': ['cheap', 'cheapest', 'low cost', 'budget', 'ارخص', 'الأرخص', 'اقل سعر'],
    'most_expensive': ['expensive', 'premium', 'most expensive', 'اغلى', 'الأغلى'],
    'closest': ['close', 'closest', 'near', 'nearest', 'nearby', 'اقرب', 'الأقرب'],
    'farthest': ['far', 'farthest', 'furthest', 'ابعد', 'الأبعد'],
    'fastest': ['fast', 'fastest', 'quick', 'urgent', 'soonest', 'اسرع', 'الأسرع'],
}
AGENT_ACTIONS = {
    'inspect_request',
    'list_services',
    'fetch_backend_context',
    'search_services',
    'draft_answer',
}

DEEP_ENABLED = get_env_bool('DEEP_ENABLED', True)
DEEP_MIN_CONFIDENCE = get_env_float('DEEP_MIN_CONFIDENCE', 0.15)
DEEP_BLEND_ALPHA = min(max(get_env_float('DEEP_BLEND_ALPHA', 0.25), 0.0), 1.0)
DEEP_LEARNING_RATE = get_env_float('DEEP_LEARNING_RATE', 0.03)
DEEP_EPOCHS = max(1, get_env_int('DEEP_EPOCHS', 18))
DEEP_STATE_PATH = os.environ.get('DEEP_STATE_PATH', 'deep_model_state.json')
DEEP_BOOTSTRAP_ON_START = get_env_bool('DEEP_BOOTSTRAP_ON_START', False)

NODE_ENV = str(os.environ.get('NODE_ENV', 'development')).strip().lower()
MANUAL_FEEDBACK_ENABLED = get_env_bool('MANUAL_FEEDBACK_ENABLED', NODE_ENV != 'production')
BACKEND_CONTEXT_ENABLED = get_env_bool('BACKEND_CONTEXT_ENABLED', True)
BACKEND_CONTEXT_BASE_URL = os.environ.get('BACKEND_CONTEXT_BASE_URL', '').strip().rstrip('/')
BACKEND_CONTEXT_TIMEOUT_SECONDS = max(1.0, get_env_float('BACKEND_CONTEXT_TIMEOUT_SECONDS', 4.0))
BACKEND_CONTEXT_MAX_ITEMS = max(1, get_env_int('BACKEND_CONTEXT_MAX_ITEMS', 50))

MONGODB_URI = os.environ.get('MONGODB_URI', '').strip()
MONGODB_DB_NAME = os.environ.get('MONGODB_DB_NAME', 'servpro_ai').strip() or 'servpro_ai'
MONGODB_CONNECT_TIMEOUT_MS = max(500, get_env_int('MONGODB_CONNECT_TIMEOUT_MS', 3000))

# Lazy MongoDB initialization - don't connect at startup
MONGO_CONTEXT = None
MONGO_ENABLED = False
MONGO_MODELS_COLLECTION = None
MONGO_FEEDBACK_COLLECTION = None
mongo_initialized = False

def get_mongo_context():
    """Lazy initialize MongoDB connection on first use"""
    global MONGO_CONTEXT, MONGO_ENABLED, MONGO_MODELS_COLLECTION, MONGO_FEEDBACK_COLLECTION, mongo_initialized
    
    if mongo_initialized:
        return MONGO_CONTEXT
    
    mongo_initialized = True
    
    if not MONGODB_URI:
        MONGO_CONTEXT = {'enabled': False, 'client': None, 'db': None, 'models': None, 'feedback': None}
        return MONGO_CONTEXT

    if MongoClient is None:
        MONGO_CONTEXT = {'enabled': False, 'client': None, 'db': None, 'models': None, 'feedback': None}
        return MONGO_CONTEXT

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

        MONGO_CONTEXT = {
            'enabled': True,
            'client': client,
            'db': db,
            'models': models_collection,
            'feedback': feedback_collection
        }
        MONGO_ENABLED = True
        MONGO_MODELS_COLLECTION = models_collection
        MONGO_FEEDBACK_COLLECTION = feedback_collection
        print(f"✅ MongoDB connected ({MONGODB_DB_NAME})")
        return MONGO_CONTEXT
    except Exception as exc:
        print(f"⚠️ MongoDB unavailable - using file-only persistence: {exc}")
        MONGO_CONTEXT = {'enabled': False, 'client': None, 'db': None, 'models': None, 'feedback': None}
        return MONGO_CONTEXT


def init_mongo():
    """Legacy wrapper - now calls lazy initialization"""
    return get_mongo_context()


def get_gemini_model():
    """Lazy initialize Gemini API on first use"""
    global gemini_model, gemini_initialized, GENAI_AVAILABLE
    
    if gemini_initialized:
        return gemini_model
    
    gemini_initialized = True
    
    if not GENAI_AVAILABLE or not GEMINI_API_KEY:
        print("⚠️  Gemini API not available - fallback to local NLP")
        return None
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_model = genai.GenerativeModel('gemini-flash-latest')
        print("✅ Gemini API initialized on first use")
        return gemini_model
    except Exception as e:
        print(f"⚠️  Gemini API initialization failed: {e} - fallback to local NLP")
        return None


def build_agent_trace_step(step, status, details, payload=None):
    return {
        'step': step,
        'status': status,
        'details': details,
        'payload': payload,
    }


def summarize_agent_scores(scores, limit=3):
    if not isinstance(scores, dict):
        return []

    ranked_scores = []
    for service_key, score_data in scores.items():
        if not isinstance(score_data, dict):
            continue

        combined_score = score_data.get('combined_score')
        if combined_score is None:
            combined_score = score_data.get('score', score_data.get('similarity', 0.0))

        try:
            ranked_scores.append({
                'service': service_key,
                'score': float(combined_score),
            })
        except (TypeError, ValueError):
            continue

    ranked_scores.sort(key=lambda item: item['score'], reverse=True)
    return ranked_scores[:max(1, limit)]


def generate_agent_clarification(language='en', confidence=0.0):
    if language == 'ar':
        return (
            "أنا أستطيع متابعة الطلب كوكيل ذكي، لكن أحتاج توضيحًا واحدًا قبل المتابعة: "
            "هل يتعلق الطلب بالسباكة أو الكهرباء أو التكييف أو التنظيف؟"
        )

    if confidence < AGENT_CLARIFICATION_THRESHOLD:
        return (
            "I can act on this as an agent, but I need one more detail first: "
            "is this about plumbing, electrical work, HVAC, or cleaning?"
        )

    return (
        "I have enough context to continue as an agent, but please confirm the exact service "
        "if you want a more precise recommendation."
    )


def is_agent_service_catalog_request(cleaned_input):
    user_tokens = set(normalize_tokens(cleaned_input))
    generic_count = len(user_tokens & AGENT_GENERIC_SERVICE_KEYWORDS)
    return generic_count >= 2 and cleaned_input.lower().count('?') > 0


def strip_agent_preference_terms(cleaned_input, preference):
    if not preference:
        return str(cleaned_input).strip()

    cleaned_text = str(cleaned_input)
    for tok in AGENT_PREFERENCE_TOKEN_ALIASES.get(preference, []):
        cleaned_text = re.sub(r"\\b" + re.escape(tok) + r"\\b", '', cleaned_text, flags=re.IGNORECASE)
    return ' '.join(cleaned_text.split()).strip()


def build_agent_service_catalog_response(user_input, language, agent_plan, agent_trace, services_list):
    if language == 'ar':
        services_str = '، '.join(services_list)
        message = f"الخدمات المتاحة لدينا هي: {services_str}. أي خدمة تحتاج؟"
    else:
        services_str = ', '.join(services_list)
        message = f"Our available services are: {services_str}. Which one do you need?"

    return {
        'user_input': user_input,
        'language': language,
        'message': message,
        'detected_service': None,
        'confidence': 0.0,
        'recommendations': [],
        'needs_preference': False,
        'preference_options': [],
        'all_scores': {},
        'agent_mode': True,
        'agent_plan': agent_plan,
        'agent_trace': agent_trace,
        'next_action': 'list_services',
        'source': 'service_catalog',
        'fallback_used': False,
    }


def analyze_service_request(user_input, language='en', preference=None, prompt_context=None):
    cleaned_input = strip_agent_preference_terms(user_input, preference)
    tfidf_result = recommender.recommend_service(cleaned_input)
    llm_result = llm_nlp_classify(cleaned_input, language, prompt_context=prompt_context, preference=preference)
    merged_result = merge_tfidf_llm_scores(tfidf_result, llm_result)
    deep_result = deep_nlp_classify(cleaned_input)
    merged_result = merge_with_deep_scores(merged_result, deep_result)

    return {
        'cleaned_input': cleaned_input,
        'tfidf_result': tfidf_result,
        'llm_result': llm_result,
        'deep_result': deep_result,
        'merged_result': merged_result,
    }


def serialize_agent_state(state):
    return {
        'user_input': state.get('user_input'),
        'language': state.get('language'),
        'preference': state.get('preference'),
        'step': state.get('step'),
        'available_tools': sorted(AGENT_ACTIONS),
        'have_inspection': bool(state.get('inspection')),
        'have_context': bool(state.get('prompt_context')),
        'have_analysis': bool(state.get('analysis')),
        'service_catalog_request': bool(state.get('service_catalog_request')),
        'recent_observations': state.get('agent_trace', [])[-4:],
    }


def normalize_agent_action(action):
    if not action:
        return None
    candidate = str(action).strip().lower()
    return candidate if candidate in AGENT_ACTIONS else None


def plan_agent_action(state):
    heuristic_action = None
    if not state.get('inspection'):
        heuristic_action = 'inspect_request'
    elif state.get('service_catalog_request'):
        heuristic_action = 'list_services'
    elif not state.get('prompt_context'):
        heuristic_action = 'fetch_backend_context'
    elif not state.get('analysis'):
        heuristic_action = 'search_services'
    else:
        heuristic_action = 'draft_answer'

    model = get_gemini_model()
    if not model:
        return {
            'action': heuristic_action,
            'reason': 'heuristic fallback because Gemini is unavailable',
            'tool_input': {},
        }

    prompt = f"""You are a tool-using AI agent for a home-services platform.
Choose exactly one next action from: inspect_request, list_services, fetch_backend_context, search_services, draft_answer.
Return strict JSON only.

Agent state:
{json.dumps(serialize_agent_state(state), ensure_ascii=False, indent=2)}

Rules:
- Use inspect_request first if the request still needs normalization.
- Use list_services when the user is asking what services exist.
- Use fetch_backend_context when live service catalog matches might help.
- Use search_services to classify and rank candidate services.
- Use draft_answer only when enough evidence exists to answer.

Return this schema:
{{"action":"inspect_request|list_services|fetch_backend_context|search_services|draft_answer","reason":"short reason","tool_input":{{}}}}
"""

    try:
        response = model.generate_content(prompt, request_options={"timeout": LLM_TIMEOUT_SECONDS})
        text = response.text if response and hasattr(response, 'text') else ''
        payload = extract_json_object(text)
        action = normalize_agent_action(payload.get('action') if isinstance(payload, dict) else None)
        if action:
            return {
                'action': action,
                'reason': str(payload.get('reason', '')).strip() if isinstance(payload, dict) else '',
                'tool_input': payload.get('tool_input', {}) if isinstance(payload, dict) else {},
            }
    except Exception as exc:
        print(f"⚠️ Agent planner failed, using heuristic plan: {exc}")

    return {
        'action': heuristic_action,
        'reason': 'heuristic fallback plan',
        'tool_input': {},
    }


def build_agent_empty_input_response(language):
    return {
        'error': EMPTY_INPUT_ERROR,
        'message': EMPTY_INPUT_MESSAGE_AR if language == 'ar' else EMPTY_INPUT_MESSAGE_EN,
        'agent_mode': True,
        'agent_type': 'tool_using_ai_agent',
        'tool_calls': [],
        'agent_trace': [],
        'next_action': 'clarify',
    }


def tool_inspect_request(state):
    cleaned_input = str(state['user_input']).strip()
    if state.get('conversation_summary'):
        cleaned_input = f"{state['conversation_summary']} {cleaned_input}".strip()
    preference = state.get('preference') or extract_preference(cleaned_input)
    service_catalog_request = is_agent_service_catalog_request(cleaned_input)
    inspection = {
        'cleaned_input': cleaned_input,
        'preference': preference,
        'service_catalog_request': service_catalog_request,
        'context_summary': state.get('conversation_summary', ''),
    }
    state['inspection'] = inspection
    state['cleaned_input'] = cleaned_input
    state['preference'] = preference
    state['service_catalog_request'] = service_catalog_request
    return inspection


def tool_list_services(state):
    services_list = [service_data['service_name'] for service_data in SERVICES_DB.values()]
    catalog = build_agent_service_catalog_response(
        state['user_input'],
        state['language'],
        state['agent_plan'],
        state['agent_trace'],
        services_list,
    )
    state['catalog'] = catalog
    return catalog


def tool_fetch_backend_context(state):
    context = fetch_backend_prompt_context(state.get('cleaned_input') or state['user_input'])
    state['prompt_context'] = context
    return context


def tool_search_services(state):
    prompt_context = state.get('prompt_context') or fetch_backend_prompt_context(state.get('cleaned_input') or state['user_input'])
    state['prompt_context'] = prompt_context
    analysis = analyze_service_request(
        state.get('cleaned_input') or state['user_input'],
        language=state['language'],
        preference=state.get('preference'),
        prompt_context=prompt_context,
    )
    state['analysis'] = analysis
    return analysis


def tool_draft_answer(state):
    if state.get('service_catalog_request') and not state.get('analysis'):
        catalog = state.get('catalog') or tool_list_services(state)
        state['final_response'] = catalog
        return catalog

    analysis = state.get('analysis') or tool_search_services(state)
    merged = analysis['merged_result']
    llm_result = analysis['llm_result']
    deep_result = analysis['deep_result']
    prompt_context = state.get('prompt_context') or {'used': False, 'matched_services': [], 'error': None}

    if merged.get('detected_service') and merged.get('confidence', 0.0) > 0:
        final_response = build_agent_selected_service_response(
            user_input=state['user_input'],
            language=state['language'],
            preference=state.get('preference'),
            is_first_prompt=state.get('is_first_prompt', False),
            agent_plan=state['agent_plan'],
            agent_trace=state['agent_trace'],
            result=merged,
            llm_result=llm_result,
            prompt_context=prompt_context,
            deep_result=deep_result,
        )
    else:
        final_response = build_agent_fallback_response(
            state['user_input'],
            state['language'],
            merged.get('confidence', 0.0),
            state['agent_plan'],
            state['agent_trace'],
        )

    final_response['agent_mode'] = True
    final_response['agent_type'] = 'tool_using_ai_agent'
    final_response['tool_calls'] = state.get('tool_calls', [])
    state['final_response'] = final_response
    return final_response


def finalize_agent_response(state, response):
    response['tool_calls'] = state.get('tool_calls', [])
    response['agent_trace'] = state.get('agent_trace', [])
    response['agent_plan'] = state.get('agent_plan', [])
    response['agent_mode'] = True
    response['agent_type'] = 'tool_using_ai_agent'
    response['next_action'] = response.get('next_action', 'final')
    response['source'] = response.get('source', 'agent')
    return response


def run_agent_step(state):
    plan = plan_agent_action(state)
    action = normalize_agent_action(plan.get('action'))
    if not action:
        action = 'inspect_request' if not state.get('inspection') else 'draft_answer'

    tool_input = plan.get('tool_input') or {}
    state['agent_trace'].append(build_agent_trace_step(
        'planner',
        action,
        plan.get('reason', ''),
        {'step': state['step'], 'tool_input': tool_input},
    ))

    tool_map = {
        'inspect_request': tool_inspect_request,
        'list_services': tool_list_services,
        'fetch_backend_context': tool_fetch_backend_context,
        'search_services': tool_search_services,
        'draft_answer': tool_draft_answer,
    }
    tool_output = tool_map[action](state)
    state['tool_calls'].append({
        'step': state['step'],
        'action': action,
        'tool_input': tool_input,
        'tool_output_type': type(tool_output).__name__,
    })
    state['agent_trace'].append(build_agent_trace_step(
        action,
        'done',
        f'completed {action}',
        {'output_type': type(tool_output).__name__},
    ))

    if action in {'list_services', 'draft_answer'}:
        return finalize_agent_response(state, state.get('final_response') or tool_output)

    return None


def execute_agent_tool(state):
    return run_agent_step(state)


def build_agent_selected_service_response(
    user_input,
    language,
    preference,
    is_first_prompt,
    agent_plan,
    agent_trace,
    result,
    llm_result,
    prompt_context,
    deep_result,
):
    response = {
        'user_input': user_input,
        'preference': preference,
        'detected_service': result['detected_service'],
        'confidence': result['confidence'],
        'language': language,
        'recommendations': [],
        'agent_mode': True,
        'agent_plan': agent_plan,
        'agent_trace': agent_trace,
        'next_action': 'recommend',
        'source': result.get('source', 'tfidf'),
        'fallback_used': False,
    }

    service_data = SERVICES_DB.get(result['detected_service'])
    if not service_data:
        return response

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
            issue_type,
            preference
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

    should_ask_preference = is_first_prompt and not (preference or has_preference_hint(user_input))
    if preference:
        should_ask_preference = False

    if should_ask_preference:
        preference_message = build_preference_followup_message(language)
        response['message'] = preference_message
        response['recommendations'][0]['message'] = preference_message
        response['needs_preference'] = True
        response['preference_options'] = PREFERENCE_OPTION_KEYS
        response['next_action'] = 'collect_preference'
    else:
        response['needs_preference'] = False
        response['preference_options'] = []

    response['all_scores'] = result['all_scores']
    response['llm_used'] = bool(llm_result.get('used'))
    response['deep_used'] = bool(deep_result.get('used'))
    response['backend_context_used'] = bool(prompt_context.get('used'))
    response['backend_context_match_count'] = len(prompt_context.get('matched_services') or [])
    response['backend_context_error'] = prompt_context.get('error')
    response['service_rank_preview'] = summarize_agent_scores(result.get('all_scores', {}))
    return response


def build_agent_fallback_response(user_input, language, confidence, agent_plan, agent_trace):
    agent_trace.append(build_agent_trace_step(
        'fallback',
        'clarify',
        'the agent asked for a narrower service description instead of guessing',
    ))

    return {
        'user_input': user_input,
        'language': language,
        'message': generate_agent_clarification(language, confidence),
        'detected_service': None,
        'confidence': confidence,
        'recommendations': [],
        'needs_preference': False,
        'preference_options': [],
        'all_scores': {},
        'agent_mode': True,
        'agent_plan': agent_plan,
        'agent_trace': agent_trace,
        'next_action': 'clarify',
        'source': 'agent_clarification',
        'fallback_used': True,
        'suggestions': [s['service_name'] for s in SERVICES_DB.values()],
        'llm_used': False,
        'deep_used': False,
        'backend_context_used': False,
        'backend_context_match_count': 0,
        'backend_context_error': None,
        'service_rank_preview': [],
    }


def execute_agentic_recommendation(user_input, language='en', is_first_prompt=False, preference=None, conversation_history=None):
    conversation_history = conversation_history or []
    recent_messages = [
        msg for msg in conversation_history[-3:]
        if isinstance(msg, dict) and msg.get('type') == 'user'
    ]
    conversation_summary = ' '.join([msg.get('text', '') for msg in recent_messages if msg.get('text')])

    state = {
        'user_input': str(user_input or '').strip(),
        'language': language or 'en',
        'is_first_prompt': bool(is_first_prompt),
        'preference': preference or extract_preference(user_input),
        'conversation_summary': conversation_summary,
        'conversation_history': conversation_history,
        'step': 0,
        'agent_plan': [
            'inspect the request',
            'choose and run tools',
            'decide whether to answer or clarify',
        ],
        'agent_trace': [],
        'tool_calls': [],
    }

    if not state['user_input']:
        return build_agent_empty_input_response(state['language'])

    for step_index in range(AGENT_MAX_STEPS):
        state['step'] = step_index + 1
        response = run_agent_step(state)
        if response:
            return response

    final_response = state.get('final_response')
    if final_response:
        return finalize_agent_response(state, final_response)

    fallback = build_agent_fallback_response(state['user_input'], state['language'], 0.0, state['agent_plan'], state['agent_trace'])
    fallback['tool_calls'] = state['tool_calls']
    fallback['agent_type'] = 'tool_using_ai_agent'
    return fallback

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


PREFERENCE_OPTION_KEYS = [
    'cheapest',
    'most_expensive',
    'closest',
    'farthest',
    'fastest'
]


def has_preference_hint(user_input):
    """Detect whether the user already gave a sorting priority."""
    normalized_text = str(user_input or '').strip().lower()
    if not normalized_text:
        return False

    preference_patterns = [
        r'\b(cheap|cheapest|lowest\s+price|budget|affordable|low\s*cost)\b',
        r'\b(expensive|most\s+expensive|premium|high\s*end|costliest)\b',
        r'\b(close|closest|near|nearest|nearby|around\s+me)\b',
        r'\b(far|farthest|furthest)\b',
        r'\b(fast|fastest|quick|quickest|urgent|soonest)\b',
        r'(\bارخص\b|\bالأرخص\b|\bاقل\s*سعر\b|\bاغلى\b|\bالأغلى\b|\bاقرب\b|\bالأقرب\b|\bابعد\b|\bالأبعد\b|\bاسرع\b|\bالأسرع\b)'
    ]

    return any(re.search(pattern, normalized_text) for pattern in preference_patterns)


def extract_preference(user_input):
    """Return normalized preference key if present in the user input, else None."""
    if not user_input:
        return None

    text = user_input.strip().lower()

    mapping = {
        'cheapest': ['cheap', 'cheapest', 'low cost', 'budget', 'ارخص', 'الأرخص', 'اقل سعر'],
        'most_expensive': ['expensive', 'premium', 'most expensive', 'اغلى', 'الأغلى'],
        'closest': ['close', 'closest', 'near', 'nearest', 'nearby', 'اقرب', 'الأقرب'],
        'farthest': ['far', 'farthest', 'furthest', 'ابعد', 'الأبعد'],
        'fastest': ['fast', 'fastest', 'quick', 'urgent', 'soonest', 'اسرع', 'الأسرع']
    }

    for key, tokens in mapping.items():
        for token in tokens:
            if token in text:
                return key

    return None


def build_preference_followup_message(language='en'):
    if language == 'ar':
        return 'ما هي أولويتك في الاختيار: الأرخص، الأغلى، الأقرب، الأبعد، أم الأسرع؟'

    return 'What is your preference: cheapest, most expensive, closest, farthest, or fastest?'


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


def resolve_backend_context_base_url():
    if BACKEND_CONTEXT_BASE_URL:
        return BACKEND_CONTEXT_BASE_URL

    try:
        return request.host_url.rstrip('/')
    except Exception:
        return ''


def fetch_backend_prompt_context(user_input):
    """Fetch live services from backend and keep only prompt-relevant matches."""
    context = {
        'enabled': bool(BACKEND_CONTEXT_ENABLED),
        'used': False,
        'source_url': None,
        'total_services': 0,
        'matched_services': [],
        'error': None
    }

    if not BACKEND_CONTEXT_ENABLED:
        return context

    base_url = resolve_backend_context_base_url()
    if not base_url:
        context['error'] = 'No BACKEND_CONTEXT_BASE_URL configured'
        return context

    services_url = f"{base_url}/services"
    context['source_url'] = services_url

    try:
        request_obj = Request(services_url, method='GET')
        with urlopen(request_obj, timeout=BACKEND_CONTEXT_TIMEOUT_SECONDS) as response_obj:
            payload = json.loads(response_obj.read().decode('utf-8'))
    except Exception as exc:
        context['error'] = str(exc)
        return context

    items = payload.get('items', []) if isinstance(payload, dict) else []
    if not isinstance(items, list):
        items = []

    context['used'] = True
    context['total_services'] = len(items)

    user_tokens = set(normalize_tokens(user_input))
    ranked_matches = []
    for item in items:
        if not isinstance(item, dict):
            continue

        category = str(item.get('category', '')).strip().upper()
        name = str(item.get('name', '')).strip()
        description = str(item.get('description', '')).strip()
        searchable = f"{name} {category} {description}".strip()
        if not searchable:
            continue

        item_tokens = set(normalize_tokens(searchable))
        matched_tokens = sorted(user_tokens & item_tokens)
        if not matched_tokens:
            continue

        ranked_matches.append({
            'id': str(item.get('_id') or item.get('id') or ''),
            'name': name,
            'category': category,
            'price_min': item.get('priceMin'),
            'currency': item.get('currency') or 'TND',
            'duration': item.get('duration'),
            'matched_tokens': matched_tokens,
            'score': len(matched_tokens)
        })

    ranked_matches.sort(key=lambda x: x.get('score', 0), reverse=True)
    context['matched_services'] = ranked_matches[:BACKEND_CONTEXT_MAX_ITEMS]
    return context


def llm_nlp_classify(user_input, language='en', prompt_context=None, preference=None):
    """Use Gemini to perform structured NLP classification for service routing with coherence to service type and preferences."""
    llm_result = {
        'enabled': bool(LLM_ENABLED),  # Will try to use if available
        'used': False,
        'detected_service': None,
        'confidence': 0.0,
        'issue_type': 'general',
        'service_scores': {},
        'assistant_message': None
    }

    if not LLM_ENABLED:
        return llm_result
    
    # Lazy-load Gemini on first use
    model = get_gemini_model()
    if not model:
        return llm_result

    # Build service catalog with domain-specific context
    service_catalog = []
    service_details = {
        'plomberie': 'Water systems, leaks, pipes, fixtures, drains | Keywords: leak, drain, faucet, toilet, pipe',
        'electricite': 'Electrical systems, wiring, power, lights, circuits | Keywords: power, wire, light, breaker, outlet',
        'climatisation': 'HVAC, cooling, heating, air conditioning, thermostat | Keywords: cooling, heating, AC, temperature',
        'nettoyage': 'Cleaning services, sanitization, dust, hygiene | Keywords: cleaning, dust, sanitation, hygiene'
    }
    for key, data in SERVICES_DB.items():
        service_catalog.append(f"- {key}: {data['service_name']} ({data['category']}) | {service_details.get(key, '')}")

    # Build backend context with preference-relevant information
    backend_context_lines = []
    if prompt_context and prompt_context.get('used'):
        matches = prompt_context.get('matched_services') or []
        for match in matches[:5]:
            duration_str = f", duration={match.get('duration')}" if match.get('duration') else ""
            price_str = f", priceMin={match.get('price_min')} {match.get('currency', 'TND')}" if match.get('price_min') else ""
            backend_context_lines.append(f"- {match.get('name')} ({match.get('category')}){price_str}{duration_str}")
    backend_context_block = chr(10).join(backend_context_lines) if backend_context_lines else "- none"

    # Build preference context for more coherent guidance
    preference_guidance = {
        'cheapest': 'User prioritizes LOWEST COST. In assistant_message, emphasize budget-friendly options and cost savings.',
        'most_expensive': 'User prioritizes PREMIUM/HIGH-END service. In assistant_message, mention quality and premium expertise.',
        'closest': 'User prioritizes PROXIMITY. In assistant_message, emphasize quick arrival and nearby availability.',
        'farthest': 'User prioritizes DISTANCE/PRIVACY. In assistant_message, suggest specialists willing to travel.',
        'fastest': 'User prioritizes SPEED. In assistant_message, emphasize urgent availability and quick turnaround.'
    }
    pref_note = preference_guidance.get(preference, 'no explicit preference stated') if preference else 'no explicit preference stated'

    # Issue type patterns for coherent categorization
    issue_patterns_text = """Issue type detection (for coherent service recommendation):
- plomberie: 'leak', 'drain', 'fixture' based on keywords
- electricite: 'power_outage', 'wiring', 'lighting' based on keywords  
- climatisation: 'no_cooling', 'heating', 'thermostat' based on keywords
- nettoyage: 'deep_cleaning', 'dust', 'sanitation' based on keywords"""

    # Language-specific prompt instructions for coherence
    if language == 'ar':
        prompt = f"""أنت متخصص في تصنيف طلبات الخدمات المنزلية للدردشة الآلية.
أرجع JSON فقط، بدون markdown.

الخدمات المتاحة:
{chr(10).join(service_catalog)}

السياق الحي (الخدمات المتطابقة من النظام):
{backend_context_block}

تفضيل المستخدم:
{pref_note}

{issue_patterns_text}

مخرجات JSON (يجب أن تكون متسقة مع نوع الخدمة والتفضيل):
{{
  "detected_service": "plomberie|electricite|climatisation|nettoyage|null",
  "confidence": 0.0 إلى 1.0,
  "issue_type": "تسرب، انسداد، تركيبة | انقطاع، أسلاك، إضاءة | عدم تبريد، تدفئة، ثرموستات | تنظيف عميق، غبار، تعقيم",
  "service_scores": {{
    "plomberie": 0.0,
    "electricite": 0.0,
    "climatisation": 0.0,
    "nettoyage": 0.0
  }},
  "assistant_message": "رسالة توجيهية 2-3 جمل بنفس لغة المستخدم، متسقة مع الخدمة المكتشفة والتفضيل المذكور"
}}

القواعد:
- confidence و service_scores يجب أن تكون بين 0 و 1
- detected_service يجب أن تكون null إذا لم تكن هناك ثقة
- assistant_message يجب أن تعكس التفضيل المكتشف (السعر/الموقع/السرعة)
- تأكد من التسق بين نوع الخدمة والمشكلة والرسالة

نص المستخدم: "{user_input}"
"""
    else:
        prompt = f"""You are an NLP classifier for a home services chatbot. CRITICAL: responses must be COHERENT with service type, issue type, and user preferences.
Return ONLY strict JSON, no markdown.

Available Services (with domain context):
{chr(10).join(service_catalog)}

Live backend context candidates:
{backend_context_block}

User Preference Context:
{pref_note}

{issue_patterns_text}

Output JSON schema (MUST be coherent across all fields):
{{
  "detected_service": "plomberie|electricite|climatisation|nettoyage|null",
  "confidence": 0.0,
  "issue_type": "specific_issue_label",
  "service_scores": {{
    "plomberie": 0.0,
    "electricite": 0.0,
    "climatisation": 0.0,
    "nettoyage": 0.0
  }},
  "assistant_message": "2-3 sentences reflecting detected service, issue type, AND user preference in user's language"
}}

COHERENCE Rules:
- confidence and all service_scores must be between 0 and 1
- detected_service must be null only when confidence is very low (<0.15)
- issue_type MUST match the detected_service domain patterns
- assistant_message MUST:
  * Reference the specific service type
  * Acknowledge the detected problem type
  * Reflect the user's preference (cheapest/premium/closest/fastest)
  * Be professional and actionable
  * Use the same language as user input
- Keep assistant_message concise but coherent

User input: "{user_input}"
Language hint: {language}
"""

    try:
        response = model.generate_content(
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
        if self.mongo_feedback_collection is None:
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
    classifier = get_deep_classifier()
    deep_result = {
        'enabled': bool(DEEP_ENABLED and classifier and classifier.is_ready),
        'used': False,
        'detected_service': None,
        'confidence': 0.0,
        'service_scores': {}
    }

    if not DEEP_ENABLED or not classifier or not classifier.is_ready:
        return deep_result

    try:
        label, confidence, scores = classifier.predict(user_input)
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
deep_classifier = None


def get_deep_classifier():
    global deep_classifier

    if deep_classifier is not None:
        return deep_classifier

    try:
        deep_classifier = DeepServiceClassifier(
            SERVICES_DB,
            state_path=DEEP_STATE_PATH,
            mongo_models_collection=MONGO_MODELS_COLLECTION,
            mongo_feedback_collection=MONGO_FEEDBACK_COLLECTION
        )
    except Exception as exc:
        deep_classifier = None
        print(f"⚠️ Deep classifier initialization failed, continuing without deep model: {exc}")

    return deep_classifier


if DEEP_BOOTSTRAP_ON_START:
    get_deep_classifier()

@app.route('/health', methods=['GET'])
def health():
    """Fast health check endpoint - always returns 200 when the process is alive."""
    gemini_ready = bool(gemini_initialized and gemini_model)
    mongo_ready = bool(mongo_initialized and MONGO_CONTEXT and MONGO_CONTEXT.get('enabled'))

    return jsonify({
        'status': 'healthy',
        'service': 'AI Agent service is running',
        'version': '1.3.0',
        'timestamp': datetime.now().isoformat(),
        'services_available': {
            'nlp_tfidf': True,
            'llm_gemini': gemini_ready,
            'mongodb': mongo_ready,
        },
        'startup_complete': gemini_initialized and mongo_initialized,
        'agent_mode': AGENT_MODE_ENABLED,
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
        'count': len(services_list)
    }), 200


@app.route('/recommend', methods=['POST'])
def recommend():
    """Compatibility endpoint that now runs the agentic service orchestrator."""
    language = 'en'
    try:
        data = request.get_json() or {}
        user_input = str(data.get('text', '')).strip()
        language = data.get('language', 'en')
        is_first_prompt = bool(data.get('is_first_prompt', False))
        preference = data.get('preference') or None
        conversation_history = data.get('conversation_history', [])

        if not preference:
            preference = extract_preference(user_input)

        if not user_input:
            return jsonify({
                'error': EMPTY_INPUT_ERROR,
                'message': 'الرجاء توفير نص' if language == 'ar' else 'Please provide some text'
            }), 400

        response = execute_agentic_recommendation(
            user_input=user_input,
            language=language,
            is_first_prompt=is_first_prompt,
            preference=preference,
            conversation_history=conversation_history,
        )
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


@app.route('/agent', methods=['POST'])
def agent():
    """Agent-first endpoint that returns the same orchestrated response as /recommend."""
    data = request.get_json() or {}
    user_input = str(data.get('text', '')).strip()
    language = data.get('language', 'en')
    is_first_prompt = bool(data.get('is_first_prompt', False))
    preference = data.get('preference') or extract_preference(user_input)
    conversation_history = data.get('conversation_history', [])

    if not user_input:
        return jsonify({
            'error': EMPTY_INPUT_ERROR,
            'message': 'الرجاء توفير نص' if language == 'ar' else 'Please provide some text'
        }), 400

    response = execute_agentic_recommendation(
        user_input=user_input,
        language=language,
        is_first_prompt=is_first_prompt,
        preference=preference,
        conversation_history=conversation_history,
    )
    response['endpoint'] = 'agent'
    response['agent_mode'] = True
    return jsonify(response), 200

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
            return jsonify({'error': EMPTY_INPUT_ERROR}), 400
        
        # Consider explicit or inferred preference for analysis
        preference = data.get('preference') or extract_preference(user_input)
        cleaned_input = str(user_input)
        if preference:
            pref_tokens = {
                'cheapest': ['cheap', 'cheapest', 'low cost', 'budget', 'ارخص', 'الأرخص', 'اقل سعر'],
                'most_expensive': ['expensive', 'premium', 'most expensive', 'اغلى', 'الأغلى'],
                'closest': ['close', 'closest', 'near', 'nearest', 'nearby', 'اقرب', 'الأقرب'],
                'farthest': ['far', 'farthest', 'furthest', 'ابعد', 'الأبعد'],
                'fastest': ['fast', 'fastest', 'quick', 'urgent', 'soonest', 'اسرع', 'الأسرع']
            }
            tokens_to_remove = pref_tokens.get(preference, [])
            for tok in tokens_to_remove:
                cleaned_input = re.sub(r"\\b" + re.escape(tok) + r"\\b", '', cleaned_input, flags=re.IGNORECASE)
            cleaned_input = ' '.join(cleaned_input.split()).strip()

        prompt_context = fetch_backend_prompt_context(cleaned_input)
        tfidf_result = recommender.recommend_service(cleaned_input)
        llm_result = llm_nlp_classify(cleaned_input, language, prompt_context=prompt_context, preference=preference)
        result = merge_tfidf_llm_scores(tfidf_result, llm_result)
        deep_result = deep_nlp_classify(cleaned_input)
        result = merge_with_deep_scores(result, deep_result)
        
        return jsonify({
            'user_input': user_input,
            'language': language,
            'scores': result['all_scores'],
            'best_match': {
                'service': result['detected_service'],
                'confidence': result['confidence']
            },
            'backend_context': {
                'used': bool(prompt_context.get('used')),
                'match_count': len(prompt_context.get('matched_services') or []),
                'matches': (prompt_context.get('matched_services') or [])[:10],
                'error': prompt_context.get('error')
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
        if not MANUAL_FEEDBACK_ENABLED:
            return jsonify({
                'error': 'Feedback endpoint disabled',
                'message': 'Manual feedback/training submissions are disabled in this environment'
            }), 403

        data = request.get_json() or {}
        user_input = str(data.get('text', '')).strip()
        expected_service = normalize_service_label(data.get('expected_service'))
        epochs = data.get('epochs', 4)

        try:
            epochs = int(epochs)
        except (TypeError, ValueError):
            epochs = 4

        if not user_input:
            return jsonify({'error': EMPTY_INPUT_ERROR}), 400

        if expected_service not in SERVICES_DB:
            return jsonify({'error': 'Invalid expected_service', 'allowed': list(SERVICES_DB.keys())}), 400

        classifier = get_deep_classifier()
        if not DEEP_ENABLED or not classifier:
            return jsonify({'error': 'Deep model is disabled'}), 400

        trained = classifier.train_online(
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

        predicted_service, confidence, scores = classifier.predict(user_input)
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

def generate_response(service_key, language='en', issue_type='general', preference=None):
    """Generate coherent, actionable response message matching service type, issue type, and user preference."""

    # Base advice coherent with service type and issue
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

    # Preference-specific suffixes to enhance coherence with user intent
    preference_suffix = {
        'cheapest': {
            'en': 'We can match you with budget-friendly providers offering competitive rates.',
            'ar': 'يمكننا توصيلك بمقدمي خدمات اقتصاديين يقدمون أسعار منافسة.'
        },
        'most_expensive': {
            'en': 'We will connect you with premium, highly-rated specialists.',
            'ar': 'سنوصلك بمتخصصين من الدرجة الأولى عالي التقييم.'
        },
        'closest': {
            'en': 'We\'ll prioritize providers nearest to your location for quick service.',
            'ar': 'سنعطي الأولوية لمقدمي الخدمة القريبين منك للخدمة السريعة.'
        },
        'farthest': {
            'en': 'We can arrange service from providers at your preferred distance.',
            'ar': 'يمكننا ترتيب الخدمة من مقدمي خدمات على المسافة التي تفضلها.'
        },
        'fastest': {
            'en': 'We\'ll match you with providers offering urgent availability.',
            'ar': 'سنوصلك بمقدمي خدمات يوفرون توفرًا عاجلاً.'
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

    # Append preference-aware suffix if preference is specified
    suffix = ''
    if preference and preference in preference_suffix:
        suffix_text = preference_suffix[preference].get(language, preference_suffix[preference].get('en', ''))
        suffix = f' {suffix_text}'

    if language == 'ar':
        return f" {advice}{suffix} "
    
    return f" {advice}{suffix}"

def generate_gemini_response(user_input, language='en', confidence=0.0):
    """
    Generate response using Google Gemini API when confidence is low.
    Provides contextual, professional, and optimistic responses for on-demand services.
    """
    # Lazy-load Gemini on first use
    model = get_gemini_model()
    if not model:
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
            response = model.generate_content(system_prompt, request_options={"timeout": 8})
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

    print("🤖 Starting Python AI Agent Service...")
    print(f"📍 Python AI Service running on http://{host}:{port}")
    print("   ⚡ Optimization: Heavy components (Gemini, MongoDB) lazy-loaded on first use")
    print("   🧭 Agent mode: planning, classification, and clarification are orchestrated per request")
    print("   ✅ /health endpoint responds immediately (< 100ms)")
    print("   📚 No ML libraries required - Pure Python TF-IDF!")
    app.run(debug=False, host=host, port=port, use_reloader=False)
