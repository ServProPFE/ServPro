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

const primaryPythonAIService = 'https://servpro-python-ai.vercel.app';
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

// Circuit breaker for Python AI service health tracking
const serviceHealthStatus = new Map();
const HEALTH_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const CIRCUIT_OPEN_THRESHOLD = 5; // Open circuit after 5 consecutive failures
const CIRCUIT_RECOVERY_TIMEOUT_MS = 60000; // Try to recover after 1 minute

const isCircuitOpen = (serviceUrl) => {
  const status = serviceHealthStatus.get(serviceUrl) || { failures: 0, lastCheckTime: 0, isOpen: false };
  if (status.isOpen && Date.now() - status.lastCheckTime > CIRCUIT_RECOVERY_TIMEOUT_MS) {
    // Try to recover
    status.isOpen = false;
    status.failures = 0;
  }
  return status.isOpen;
};

const recordSuccess = (serviceUrl) => {
  serviceHealthStatus.set(serviceUrl, { failures: 0, lastCheckTime: Date.now(), isOpen: false });
};

const recordFailure = (serviceUrl, error) => {
  const current = serviceHealthStatus.get(serviceUrl) || { failures: 0, lastCheckTime: Date.now(), isOpen: false };
  current.failures += 1;
  current.lastCheckTime = Date.now();
  
  if (current.failures >= CIRCUIT_OPEN_THRESHOLD) {
    current.isOpen = true;
    console.warn(`⚠️  Circuit breaker OPEN for ${serviceUrl} after ${current.failures} failures`);
  }
  
  serviceHealthStatus.set(serviceUrl, current);
};

const executePythonRequest = async ({ serviceUrl, method, endpoint, data, timeoutMs, retries }) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const effectiveTimeout = Math.min(timeoutMs + (attempt * 5000), 25000); // Cap timeout at 25s

      const response = await axios({
        method,
        url: `${serviceUrl}${endpoint}`,
        data,
        timeout: effectiveTimeout
      });

      recordSuccess(serviceUrl);
      return response.data;
    } catch (error) {
      lastError = error;

      // Handle 503 Service Unavailable specifically
      if (error.response?.status === 503) {
        console.error(`❌ Python AI service returned 503 (unavailable) from ${serviceUrl}`);
        recordFailure(serviceUrl, error);
        break;
      }

      if (attempt >= retries || !isRetriableAiError(error)) {
        recordFailure(serviceUrl, error);
        break;
      }

      const backoffDelay = AI_RETRY_BASE_DELAY_MS * (2 ** attempt);
      await delay(backoffDelay);
    }
  }

  throw lastError;
};

const requestPythonAI = async ({ method = 'get', endpoint, data, timeoutMs = AI_REQUEST_TIMEOUT_MS, retries = AI_MAX_RETRIES }) => {
  if (PYTHON_AI_SERVICES.length === 0) {
    throw new Error('No PYTHON_AI_SERVICE endpoint configured');
  }

  for (const serviceUrl of PYTHON_AI_SERVICES) {
    // Skip services with open circuit breakers
    if (isCircuitOpen(serviceUrl)) {
      console.warn(`⚠️  Skipping ${serviceUrl} - circuit breaker is open`);
      continue;
    }

    try {
      return await executePythonRequest({
        serviceUrl,
        method,
        endpoint,
        data,
        timeoutMs,
        retries,
      });
    } catch (error) {
      if (!isRetriableAiError(error) && error.response?.status !== 503) {
        throw error;
      }
    }
  }

  throw new Error('All Python AI services are unavailable');
};

const loadServiceAnalytics = async () => {
  const [services, bookings, ratings] = await Promise.all([
    Service.find({})
      .populate('provider', 'name email phone providerProfile.companyName providerProfile.businessName providerProfile.address providerProfile.location providerProfile.turnover providerProfile.experienceYears')
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
  const { message, language = 'en', isFirstPrompt = false, preference = null, conversationHistory = [] } = req.body;

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
      endpoint: '/agent',
      data: {
        text: message,
        language: language,
        is_first_prompt: Boolean(isFirstPrompt),
        preference: preference,
        conversation_history: Array.isArray(conversationHistory) ? conversationHistory : []
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
  const recommendedServices = Array.isArray(localResponse.recommendedServices)
    ? localResponse.recommendedServices.filter(Boolean)
    : [];

  if (recommendedServices.length === 0 && categoryFallbackService) {
    recommendedServices.push(categoryFallbackService);
  }

  const recommendedService = recommendedServices[0] || localResponse.recommendedService || categoryFallbackService || null;
  const botMessage = getRecommendationMessage(aiAnalysis, language);

  const response = {
    message: botMessage,
    detectedService: detected_service,
    confidence: confidence,
    recommendedService: recommendedService,
    recommendedServices,
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
  const healthStatus = {
    status: 'online',
    nodeBackend: 'online',
    pythonAI: null,
    circuitBreaker: {},
    timestamp: new Date()
  };

  // Check circuit breaker status for all services
  PYTHON_AI_SERVICES.forEach(serviceUrl => {
    const status = serviceHealthStatus.get(serviceUrl) || { failures: 0, isOpen: false };
    healthStatus.circuitBreaker[serviceUrl] = {
      isOpen: status.isOpen,
      failures: status.failures,
      lastCheckTime: status.lastCheckTime ? new Date(status.lastCheckTime) : null
    };
  });

  // Attempt to get health from Python AI (with shorter timeout for faster response)
  try {
    const healthResponse = await requestPythonAI({
      method: 'get',
      endpoint: '/health',
      timeoutMs: 8000, // Reduce from 15s to 8s for faster failure detection
      retries: 1 // Reduce retries for health check
    });
    
    healthStatus.pythonAI = {
      status: 'online',
      ...healthResponse
    };
  } catch (error) {
    console.error('AI service health check failed:', error.message);
    
    healthStatus.status = 'degraded';
    healthStatus.pythonAI = {
      status: 'offline',
      error: 'Python AI service is not responding',
      availableServices: PYTHON_AI_SERVICES,
      servicesWithOpenCircuits: Object.entries(healthStatus.circuitBreaker)
        .filter(([_, s]) => s.isOpen)
        .map(([url]) => url)
    };
  }

  // Determine overall status and HTTP code
  const hasOpenCircuits = Object.values(healthStatus.circuitBreaker).some(s => s.isOpen);
  const pythonAIOnline = healthStatus.pythonAI?.status === 'online';

  if (pythonAIOnline) {
    return res.status(200).json(healthStatus);
  }

  const message = hasOpenCircuits
    ? 'Python AI service is recovering from previous failures (circuit breaker open)'
    : 'Python AI service is currently unavailable';

  return res.status(200).json({
    ...healthStatus,
    message,
    httpStatus: 503
  });
});

module.exports = {
  getChatbotResponse,
  analyzeChatbotInput,
  getChatbotSuggestions,
  checkAIHealth
};
