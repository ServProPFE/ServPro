const axios = require('axios');
const { Service } = require("../models/Service");
const { asyncHandler } = require("../utils/asyncHandler");

const normalizeServiceUrl = (url) => (url || '').trim().replace(/\/$/, '');
const isProduction = process.env.NODE_ENV === 'production';

const configuredPythonAIService = (process.env.PYTHON_AI_SERVICE || '')
  .split(',')
  .map(normalizeServiceUrl)
  .filter(Boolean);

const primaryPythonAIService = 'https://chatbot-ai-smpu.onrender.com';
const legacyPythonAIService = 'https://servpro-python-ai.onrender.com';

const defaultPythonAIServices = isProduction
  ? [primaryPythonAIService, legacyPythonAIService]
  : [primaryPythonAIService, legacyPythonAIService, 'http://localhost:5000'];

const PYTHON_AI_SERVICES = Array.from(
  new Set([...configuredPythonAIService, ...defaultPythonAIServices.map(normalizeServiceUrl)]),
);

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const AI_REQUEST_TIMEOUT_MS = toPositiveInt(process.env.PYTHON_AI_TIMEOUT_MS, 20000);
const AI_MAX_RETRIES = toPositiveInt(process.env.PYTHON_AI_RETRIES, 3);
const AI_RETRY_BASE_DELAY_MS = toPositiveInt(process.env.PYTHON_AI_RETRY_BASE_DELAY_MS, 2000);

const AI_HEALTH_TIMEOUT_MS = toPositiveInt(process.env.PYTHON_AI_HEALTH_TIMEOUT_MS, 15000);
const AI_HEALTH_RETRIES = toPositiveInt(process.env.PYTHON_AI_HEALTH_RETRIES, 2);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hasClarificationIntent = (message) => {
  const normalized = String(message || '').toLowerCase();
  return [
    /\b(cheapest|lowest\s+price|low\s+cost|affordable|budget)\b/,
    /\b(closest|nearest|nearby|near\s+me|around\s+me)\b/,
    /\b(fastest|quickest|soonest|urgent)\b/,
  ].some((pattern) => pattern.test(normalized));
};

const buildClarificationMessage = (language) => {
  if (language === 'ar') {
    return 'هل تريد الأرخص أم الأقرب أم الأسرع؟ حدّد نوع الخدمة والأولوية أو المدينة وسأضيّق الخيارات لك.';
  }

  return 'Do you want the cheapest option, the closest provider, or the fastest response? Tell me the service type and your priority, and I will narrow it down.';
};

const buildOfflineResponse = (language) => ({
  message: language === 'ar'
    ? 'يمكنني مساعدتك في السباكة أو الكهرباء أو التكييف أو التنظيف. اكتب طلبك وسأقترح لك الخدمة المناسبة.'
    : 'I can help with plumbing, electrical, HVAC, or cleaning. Send your request and I will suggest the right service.',
  detectedService: null,
  confidence: 0,
  recommendedService: null,
  aiModel: 'Fallback (AI offline)',
  geminiUsed: false,
  allScores: {},
  degraded: true,
  timestamp: new Date(),
});

const buildClarificationResponse = (language) => ({
  message: buildClarificationMessage(language),
  detectedService: null,
  confidence: 0,
  recommendedService: null,
  aiModel: 'Clarification rule',
  geminiUsed: false,
  allScores: {},
  needsClarification: true,
  timestamp: new Date(),
});

const getRecommendationMessage = (aiAnalysis, language) => {
  if (aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) {
    return aiAnalysis.recommendations[0].message;
  }

  if (aiAnalysis.message) {
    return aiAnalysis.message;
  }

  return language === 'ar'
    ? 'عذراً، لم أتمكن من فهم طلبك. يرجى تحديد الخدمة المطلوبة: السباكة، الكهرباء، التكييف، أو التنظيف.'
    : 'Sorry, I couldn\'t understand your request. Please specify: plumbing, electrical, AC, or cleaning services.';
};

const getRecommendedService = async (detectedService, confidence) => {
  if (!detectedService || confidence < 0.08) {
    return null;
  }

  const categoryMap = {
    plomberie: 'PLOMBERIE',
    electricite: 'ELECTRICITE',
    climatisation: 'CLIMATISATION',
    nettoyage: 'NETTOYAGE',
  };

  const category = categoryMap[detectedService];
  if (!category) {
    return null;
  }

  return Service.findOne({ category })
    .populate('provider', 'name email phone')
    .lean();
};

const buildRecommendedServicePayload = (recommendedService) => {
  if (!recommendedService) {
    return null;
  }

  return {
    id: recommendedService._id,
    name: recommendedService.name,
    category: recommendedService.category,
    priceMin: recommendedService.priceMin,
    duration: recommendedService.duration,
    provider: {
      _id: recommendedService.provider._id,
      name: recommendedService.provider.name,
      email: recommendedService.provider.email,
      phone: recommendedService.provider.phone,
    },
    currency: recommendedService.currency || 'TND',
  };
};

const isRetriableAiError = (error) => {
  const networkCodes = new Set([
    'ECONNABORTED',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EHOSTUNREACH'
  ]);

  if (networkCodes.has(error.code)) {
    return true;
  }

  const status = error.response?.status;
  return status === 429 || status >= 500;
};

const requestPythonAI = async ({ method = 'get', endpoint, data, timeoutMs = AI_REQUEST_TIMEOUT_MS, retries = AI_MAX_RETRIES }) => {
  if (PYTHON_AI_SERVICES.length === 0) {
    throw new Error('No PYTHON_AI_SERVICE endpoint configured');
  }

  let lastError;

  for (const serviceUrl of PYTHON_AI_SERVICES) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const effectiveTimeout = timeoutMs + (attempt * 5000);

        const response = await axios({
          method,
          url: `${serviceUrl}${endpoint}`,
          data,
          timeout: effectiveTimeout
        });

        return response.data;
      } catch (error) {
        lastError = error;

        if (attempt >= retries || !isRetriableAiError(error)) {
          break;
        }

        const backoffDelay = AI_RETRY_BASE_DELAY_MS * (2 ** attempt);
        await delay(backoffDelay);
      }
    }
  }

  throw lastError;
};

// Get chatbot response with Python AI analysis
const getChatbotResponse = asyncHandler(async (req, res) => {
  const { message, language = 'en' } = req.body;

  if (!message || message.trim() === '') {
    const error = new Error(language === 'ar' ? 'الرسالة فارغة' : 'Message cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  if (hasClarificationIntent(message)) {
    return res.json(buildClarificationResponse(language));
  }

  let aiAnalysis;
  try {
    // Call Python AI service for NLP analysis
    aiAnalysis = await requestPythonAI({
      method: 'post',
      endpoint: '/recommend',
      data: {
        text: message,
        language: language
      }
    });
  } catch (aiError) {
    console.error('Python AI service error:', aiError.message);

    return res.json(buildOfflineResponse(language));
  }

  const { detected_service, confidence } = aiAnalysis;
  const recommendedService = await getRecommendedService(detected_service, confidence);
  const botMessage = getRecommendationMessage(aiAnalysis, language);

  const response = {
    message: botMessage,
    detectedService: detected_service,
    confidence: confidence,
    recommendedService: buildRecommendedServicePayload(recommendedService),
    aiModel: aiAnalysis.source === 'gemini_fallback' ? 'Gemini AI (Fallback)' : 'TF-IDF + Cosine Similarity (Python)',
    geminiUsed: aiAnalysis.fallback_used || false,
    allScores: aiAnalysis.all_scores,
    timestamp: new Date()
  };

  res.json(response);
});

// Analyze text in detail (for debugging/admin)
const analyzeChatbotInput = asyncHandler(async (req, res) => {
  const { text, language = 'en' } = req.body;

  if (!text) {
    const error = new Error('Text is required');
    error.statusCode = 400;
    throw error;
  }

  try {
    const analysisResponse = await requestPythonAI({
      method: 'post',
      endpoint: '/analyze',
      data: {
        text: text,
        language: language
      }
    });

    res.json(analysisResponse);

  } catch (error) {
    console.error('Analysis error:', error.message);
    const err = new Error('Analysis failed');
    err.statusCode = 500;
    throw err;
  }
});

// Get chatbot suggestions based on service category
const getChatbotSuggestions = asyncHandler(async (req, res) => {
  const { language = 'en' } = req.query;

  const suggestions = {
    en: [
      "I need a plumber for a leaky faucet",
      "My air conditioning is not working",
      "I need an electrician for wiring",
      "Looking for cleaning services",
      "Need help with home repairs"
    ],
    ar: [
      "أحتاج سباك لحنفية تسرب",
      "جهاز التكييف لا يعمل",
      "أحتاج كهربائي للأسلاك",
      "أبحث عن خدمات التنظيف",
      "أحتاج مساعدة في إصلاحات المنزل"
    ]
  };

  res.json({
    suggestions: suggestions[language] || suggestions['en'],
    language: language || 'en'
  });
});

// Health check for Python AI service
const checkAIHealth = asyncHandler(async (req, res) => {
  try {
    const healthResponse = await requestPythonAI({
      method: 'get',
      endpoint: '/health',
      timeoutMs: AI_HEALTH_TIMEOUT_MS,
      retries: AI_HEALTH_RETRIES
    });
    
    res.json({
      status: 'online',
      nodeBackend: 'online',
      pythonAI: healthResponse,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('AI service health check failed:', error.message);
    
    res.status(503).json({
      status: 'degraded',
      nodeBackend: 'online',
      pythonAI: {
        status: 'offline',
        error: 'Python AI service is not responding',
        urls: PYTHON_AI_SERVICES
      },
      timestamp: new Date()
    });
  }
});

module.exports = {
  getChatbotResponse,
  analyzeChatbotInput,
  getChatbotSuggestions,
  checkAIHealth
};
