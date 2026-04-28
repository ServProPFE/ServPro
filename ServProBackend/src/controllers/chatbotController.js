const axios = require('axios');
const { Service } = require("../models/Service");
const { Booking } = require("../models/Booking");
const { Notation } = require("../models/Notation");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  buildDynamicSuggestions,
  buildLocalChatbotResponse,
  buildRecommendationPayload,
} = require("../utils/chatbotEngine");

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

const loadServiceAnalytics = async () => {
  const [services, bookings, ratings] = await Promise.all([
    Service.find({})
      .populate('provider', 'name email phone providerProfile.companyName providerProfile.location providerProfile.experienceYears')
      .lean(),
    Booking.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$service', total: { $sum: 1 } } },
    ]),
    Notation.find({}).lean(),
  ]);

  const bookingCounts = new Map(bookings.map((item) => [String(item._id), Number(item.total || 0)]));
  const providerRatings = new Map(ratings.map((item) => [String(item.provider), item]));

  return {
    services,
    bookingCounts,
    providerRatings,
  };
};

const getCategoryFallbackService = async (detectedService) => {
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

  const service = await Service.findOne({ category })
    .populate('provider', 'name email phone')
    .lean();

  return buildRecommendationPayload(service);
};

// Get chatbot response with Python AI analysis
const getChatbotResponse = asyncHandler(async (req, res) => {
  const { message, language = 'en', isFirstPrompt = false } = req.body;

  if (!message || message.trim() === '') {
    const error = new Error(language === 'ar' ? 'الرسالة فارغة' : 'Message cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  const analytics = await loadServiceAnalytics();
  let aiAnalysis;
  try {
    // Call Python AI service for NLP analysis
    aiAnalysis = await requestPythonAI({
      method: 'post',
      endpoint: '/recommend',
      data: {
        text: message,
        language: language,
        is_first_prompt: Boolean(isFirstPrompt)
      }
    });
  } catch (aiError) {
    console.error('Python AI service error:', aiError.message);

    const localResponse = buildLocalChatbotResponse({
      message,
      language,
      services: analytics.services,
      providerRatings: analytics.providerRatings,
      bookingCounts: analytics.bookingCounts,
    });

    return res.json({
      ...localResponse,
      aiModel: 'Local TF-IDF + popularity ranking',
      geminiUsed: false,
      degraded: true,
      timestamp: new Date(),
    });
  }

  const { detected_service, confidence } = aiAnalysis;
  const needsPreference = Boolean(aiAnalysis.needs_preference);
  const localResponse = buildLocalChatbotResponse({
    message,
    language,
    services: analytics.services,
    providerRatings: analytics.providerRatings,
    bookingCounts: analytics.bookingCounts,
  });
  const categoryFallbackService = await getCategoryFallbackService(detected_service);
  const recommendedService = localResponse.recommendedService || categoryFallbackService;
  const botMessage = getRecommendationMessage(aiAnalysis, language);

  const response = {
    message: botMessage,
    detectedService: detected_service,
    confidence: confidence,
    recommendedService: recommendedService,
    needsPreference: needsPreference || localResponse.needsPreference,
    preferenceOptions: Array.isArray(aiAnalysis.preference_options) && aiAnalysis.preference_options.length > 0
      ? aiAnalysis.preference_options
      : localResponse.preferenceOptions,
    aiModel: aiAnalysis.source === 'gemini_fallback'
      ? 'Gemini AI (Fallback) + local reranker'
      : 'TF-IDF + Cosine Similarity (Python) + local reranker',
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
  const analytics = await loadServiceAnalytics();
  const suggestions = buildDynamicSuggestions({
    services: analytics.services,
    providerRatings: analytics.providerRatings,
    bookingCounts: analytics.bookingCounts,
    language: language || 'en',
  });

  res.json({
    suggestions,
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
