const CATEGORY_ALIASES = {
  PLOMBERIE: [
    'plomberie',
    'plombier',
    'plumber',
    'pipe',
    'pipes',
    'drain',
    'drainage',
    'sink',
    'faucet',
    'tap',
    'leak',
    'water leak',
    'toilet',
    'bathroom',
    'robinet',
    'fuite',
    'canalisation',
    'evier',
    'wast',
    'سباكة',
    'تسرب',
    'حنفية',
    'ماء',
  ],
  ELECTRICITE: [
    'electricite',
    'electricity',
    'electrician',
    'electric',
    'wire',
    'wiring',
    'circuit',
    'breaker',
    'outlet',
    'socket',
    'switch',
    'power',
    'cable',
    'lamp',
    'light',
    'ampoule',
    'interrupteur',
    'prise',
    'courant',
    'كهرباء',
    'كهربائي',
    'سلك',
    'قابس',
  ],
  CLIMATISATION: [
    'climatisation',
    'air conditioning',
    'air conditioner',
    'ac repair',
    'cooling',
    'cooler',
    'hvac',
    'ventilation',
    'compressor',
    'thermostat',
    'frigidaire',
    'aircon',
    'climatiseur',
    'tclim',
    'تكييف',
    'مكيف',
    'تبريد',
  ],
  NETTOYAGE: [
    'nettoyage',
    'cleaning',
    'cleaner',
    'clean',
    'housekeeping',
    'maid',
    'sanitize',
    'sanitization',
    'deep clean',
    'vacuum',
    'washing',
    'ménage',
    'poussiere',
    'تنظيف',
    'نظافة',
    'غسيل',
  ],
  AUTRE: [],
};

const CATEGORY_LABELS = {
  en: {
    PLOMBERIE: 'plumbing',
    ELECTRICITE: 'electrical work',
    CLIMATISATION: 'air conditioning',
    NETTOYAGE: 'cleaning',
    AUTRE: 'other services',
  },
  ar: {
    PLOMBERIE: 'السباكة',
    ELECTRICITE: 'الكهرباء',
    CLIMATISATION: 'التكييف',
    NETTOYAGE: 'التنظيف',
    AUTRE: 'خدمات أخرى',
  },
};

const CATEGORY_DETECTED_SERVICE = {
  PLOMBERIE: 'plomberie',
  ELECTRICITE: 'electricite',
  CLIMATISATION: 'climatisation',
  NETTOYAGE: 'nettoyage',
  AUTRE: null,
};

const CATEGORY_SUGGESTIONS = {
  en: {
    PLOMBERIE: 'I need a plumber for a leak',
    ELECTRICITE: 'I need an electrician for wiring',
    CLIMATISATION: 'My air conditioning needs repair',
    NETTOYAGE: 'I need cleaning for my home',
    AUTRE: 'I need help with a service request',
  },
  ar: {
    PLOMBERIE: 'أحتاج سباكًا لإصلاح تسرب',
    ELECTRICITE: 'أحتاج كهربائيًا للأسلاك',
    CLIMATISATION: 'أحتاج إصلاح التكييف',
    NETTOYAGE: 'أحتاج خدمة تنظيف للمنزل',
    AUTRE: 'أحتاج مساعدة في طلب خدمة',
  },
};

const PREFERENCE_ALIASES = {
  cheapest: [
    'cheap',
    'cheapest',
    'lowest price',
    'budget',
    'affordable',
    'low cost',
    'ar5es',
    'arhes',
    'ارخص',
    'الأرخص',
    'اقل سعر',
  ],
  most_expensive: [
    'expensive',
    'most expensive',
    'premium',
    'high end',
    'costliest',
    'اغلى',
    'الأغلى',
  ],
  fastest: [
    'fast',
    'fastest',
    'quick',
    'quickest',
    'urgent',
    'soonest',
    'asap',
    'اسرع',
    'الأسرع',
    'عاجل',
  ],
  closest: [
    'close',
    'closest',
    'near',
    'nearest',
    'nearby',
    'around me',
    'اقرب',
    'الأقرب',
    'قريب',
  ],
  farthest: [
    'far',
    'farthest',
    'furthest',
    'ابعد',
    'الأبعد',
  ],
};

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'from',
  'help',
  'i',
  'in',
  'is',
  'my',
  'need',
  'please',
  'service',
  'the',
  'to',
  'with',
  'je',
  'de',
  'des',
  'du',
  'la',
  'le',
  'les',
  'un',
  'une',
  'et',
  'pour',
  'sur',
  'dans',
  'avec',
  'mon',
  'ma',
  'mes',
  'nous',
  'vous',
]);

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .toLowerCase()
    .trim();
};

const parsePreferenceFromQuery = (query = '') => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return null;
  }

  const matchedEntry = Object.entries(PREFERENCE_ALIASES).find(([, aliases]) => aliases
    .some((alias) => normalizedQuery.includes(normalizeText(alias))));

  return matchedEntry ? matchedEntry[0] : null;
};

const tokenizeText = (value) => normalizeText(value)
  .split(/\s+/)
  .filter((token) => token.length > 1 && !STOPWORDS.has(token));

const extractProviderFields = (provider) => {
  if (!provider) {
    return [];
  }

  if (typeof provider === 'string') {
    return [provider];
  }

  return [
    provider.name,
    provider.email,
    provider.phone,
    provider.companyName,
    provider.providerProfile?.companyName,
    provider.providerProfile?.location,
    provider.providerProfile?.experienceYears,
    provider.providerProfile?.serviceRadius,
  ];
};

const buildServiceDocument = (service) => {
  const category = service?.category || '';
  const providerFields = extractProviderFields(service?.provider);

  return normalizeText([
    service?.name,
    service?.description,
    category,
    CATEGORY_LABELS.en[category],
    CATEGORY_LABELS.ar[category],
    service?.currency,
    service?.priceMin,
    service?.duration,
    ...providerFields,
  ].filter(Boolean).join(' '));
};

const computeIdfMap = (documents) => {
  const documentFrequency = new Map();

  documents.forEach((tokens) => {
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach((token) => {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    });
  });

  const totalDocuments = Math.max(documents.length, 1);
  const idf = new Map();

  documentFrequency.forEach((frequency, token) => {
    idf.set(token, Math.log((totalDocuments + 1) / (frequency + 1)) + 1);
  });

  return { idf, totalDocuments };
};

const buildWeights = (tokens, idf) => {
  const counts = new Map();

  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  const weights = new Map();
  let normSquared = 0;

  counts.forEach((count, token) => {
    const weight = count * (idf.get(token) || 1);
    weights.set(token, weight);
    normSquared += weight * weight;
  });

  return { weights, norm: Math.sqrt(normSquared) || 1 };
};

const cosineSimilarity = (queryTokens, documentTokens, idf) => {
  if (queryTokens.length === 0 || documentTokens.length === 0) {
    return 0;
  }

  const queryWeights = buildWeights(queryTokens, idf);
  const documentWeights = buildWeights(documentTokens, idf);
  const sharedTokens = new Set([...queryWeights.weights.keys(), ...documentWeights.weights.keys()]);

  let dotProduct = 0;

  sharedTokens.forEach((token) => {
    dotProduct += (queryWeights.weights.get(token) || 0) * (documentWeights.weights.get(token) || 0);
  });

  return dotProduct / (queryWeights.norm * documentWeights.norm);
};

const scoreCategoryMatch = (query, category) => {
  const normalizedQuery = normalizeText(query);
  const aliases = CATEGORY_ALIASES[category] || [];

  if (aliases.length === 0 || normalizedQuery.length === 0) {
    return 0;
  }

  const rawScore = aliases.reduce((score, alias) => {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) {
      return score;
    }

    if (normalizedQuery.includes(normalizedAlias)) {
      return score + (normalizedAlias.includes(' ') ? 2 : 1);
    }

    return score;
  }, 0);

  return Math.min(1, rawScore / Math.max(aliases.length / 4, 1));
};

const getAverageRating = (providerId, providerRatings) => {
  if (!providerId || !providerRatings) {
    return 0;
  }

  const rating = providerRatings.get(String(providerId));
  if (!rating) {
    return 0;
  }

  return Number(rating.average || 0);
};

const getBookingCount = (serviceId, bookingCounts) => {
  if (!serviceId || !bookingCounts) {
    return 0;
  }

  return Number(bookingCounts.get(String(serviceId)) || 0);
};

const rankServicesByQuery = ({ services = [], query = '', providerRatings, bookingCounts }) => {
  const documents = services.map((service) => tokenizeText(buildServiceDocument(service)));
  const { idf } = computeIdfMap(documents);
  const queryTokens = tokenizeText(query);
  const normalizedQuery = normalizeText(query);

  const ranked = services.map((service, index) => {
    const documentTokens = documents[index] || [];
    const similarity = cosineSimilarity(queryTokens, documentTokens, idf);
    const categoryScore = scoreCategoryMatch(query, service?.category);
    const serviceName = normalizeText(service?.name);
    const exactNameBoost = normalizedQuery && serviceName && normalizedQuery.includes(serviceName) ? 0.25 : 0;
    const providerRating = getAverageRating(service?.provider?._id || service?.provider, providerRatings);
    const ratingBoost = providerRating > 0 ? Math.min(0.2, Math.max(0, (providerRating - 3) / 10)) : 0;
    const bookings = getBookingCount(service?._id, bookingCounts);
    const popularityBoost = bookings > 0 ? Math.min(0.18, Math.log1p(bookings) / 12) : 0;
    const priceBoost = Number(service?.priceMin || 0) > 0 ? 0.02 : 0;
    const durationBoost = Number(service?.duration || 0) > 0 ? 0.02 : 0;

    const score = Math.min(
      1,
      (similarity * 0.62)
      + (categoryScore * 0.2)
      + exactNameBoost
      + ratingBoost
      + popularityBoost
      + priceBoost
      + durationBoost,
    );

    return {
      service,
      score,
      similarity,
      categoryScore,
      providerRating,
      bookings,
    };
  });

  return ranked.sort((left, right) => right.score - left.score);
};

const inferDetectedCategory = (query, rankedServices = []) => {
  let bestCategory = null;
  let bestScore = 0;

  Object.keys(CATEGORY_ALIASES).forEach((category) => {
    const score = scoreCategoryMatch(query, category);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });

  if (bestCategory) {
    return {
      category: bestCategory,
      detectedService: CATEGORY_DETECTED_SERVICE[bestCategory],
      confidence: bestScore,
    };
  }

  const topService = rankedServices[0]?.service;
  if (topService?.category) {
    return {
      category: topService.category,
      detectedService: CATEGORY_DETECTED_SERVICE[topService.category] || null,
      confidence: rankedServices[0]?.score || 0,
    };
  }

  return {
    category: null,
    detectedService: null,
    confidence: 0,
  };
};

const localizeCategory = (category, language = 'en') => CATEGORY_LABELS[language]?.[category] || CATEGORY_LABELS.en[category] || 'service';

const buildRecommendationPayload = (service, score = 0) => {
  if (!service) {
    return null;
  }

  const provider = service.provider || {};

  return {
    id: service._id,
    name: service.name,
    category: service.category,
    priceMin: service.priceMin,
    duration: service.duration,
    provider: {
      _id: provider._id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
    },
    currency: service.currency || 'TND',
    matchScore: Number(score.toFixed(3)),
  };
};

const applyPreferenceOrdering = (rankedServices = [], preference = null) => {
  if (!preference || rankedServices.length <= 1) {
    return rankedServices;
  }

  const sortable = [...rankedServices];

  if (preference === 'cheapest') {
    return sortable.sort((left, right) => {
      const leftPrice = Number(left?.service?.priceMin || Number.MAX_SAFE_INTEGER);
      const rightPrice = Number(right?.service?.priceMin || Number.MAX_SAFE_INTEGER);
      if (leftPrice !== rightPrice) {
        return leftPrice - rightPrice;
      }
      return right.score - left.score;
    });
  }

  if (preference === 'most_expensive') {
    return sortable.sort((left, right) => {
      const leftPrice = Number(left?.service?.priceMin || 0);
      const rightPrice = Number(right?.service?.priceMin || 0);
      if (leftPrice !== rightPrice) {
        return rightPrice - leftPrice;
      }
      return right.score - left.score;
    });
  }

  if (preference === 'fastest') {
    return sortable.sort((left, right) => {
      const leftDuration = Number(left?.service?.duration || Number.MAX_SAFE_INTEGER);
      const rightDuration = Number(right?.service?.duration || Number.MAX_SAFE_INTEGER);
      if (leftDuration !== rightDuration) {
        return leftDuration - rightDuration;
      }
      return right.score - left.score;
    });
  }

  return sortable;
};

const buildPreferenceOptions = (rankedServices, language = 'en') => {
  const options = [];
  const seenCategories = new Set();

  rankedServices.forEach(({ service }) => {
    const category = service?.category;
    if (!category || seenCategories.has(category)) {
      return;
    }

    seenCategories.add(category);
    options.push(localizeCategory(category, language));
  });

  return options.slice(0, 3);
};

const buildMultiRecommendationMessage = ({ language, recommendationCount, categoryLabel, preference }) => {
  const isArabic = language === 'ar';
  const localizedTemplates = {
    cheapest: isArabic
      ? `إليك أفضل ${recommendationCount} خيارات ضمن ${categoryLabel} مرتبة من الأرخص إلى الأغلى.`
      : `Here are the top ${recommendationCount} ${categoryLabel} options, sorted from cheapest to priciest.`,
    most_expensive: isArabic
      ? `إليك أفضل ${recommendationCount} خيارات ضمن ${categoryLabel} مرتبة من الأغلى إلى الأقل تكلفة.`
      : `Here are the top ${recommendationCount} ${categoryLabel} options, sorted from most premium to lower cost.`,
    fastest: isArabic
      ? `إليك أفضل ${recommendationCount} خيارات ضمن ${categoryLabel} مرتبة من الأسرع إلى الأبطأ.`
      : `Here are the top ${recommendationCount} ${categoryLabel} options, sorted from fastest to slowest.`,
    default: isArabic
      ? `إليك أفضل ${recommendationCount} خيارات ضمن ${categoryLabel} حسب طلبك.`
      : `Here are the top ${recommendationCount} ${categoryLabel} options based on your request.`,
  };

  return localizedTemplates[preference] || localizedTemplates.default;
};

const buildAssistantMessage = ({
  rankedServices,
  language = 'en',
  needsPreference = false,
  preference = null,
  recommendationCount = 1,
}) => {
  const isArabic = language === 'ar';
  const bestService = rankedServices[0]?.service;
  if (!bestService) {
    return isArabic
      ? 'يمكنني مساعدتك في السباكة أو الكهرباء أو التكييف أو التنظيف. اكتب طلبك وسأقترح لك الخدمة المناسبة.'
      : 'I can help with plumbing, electrical, HVAC, or cleaning. Send your request and I will suggest the right service.';
  }

  const categoryLabel = localizeCategory(bestService.category, language);

  if (needsPreference) {
    return isArabic
      ? `وجدت عدة خيارات قريبة. هل تقصد ${categoryLabel} أم تريد خدمة أخرى؟`
      : `I found a few close matches. Did you mean ${categoryLabel}, or should I narrow it down another way?`;
  }

  if (recommendationCount > 1) {
    return buildMultiRecommendationMessage({
      language,
      recommendationCount,
      categoryLabel,
      preference,
    });
  }

  return isArabic
    ? `وجدت خدمة مناسبة: ${bestService.name} (${categoryLabel}).`
    : `I found a strong match: ${bestService.name} (${categoryLabel}).`;
};

const buildLocalChatbotResponse = ({ message, language = 'en', services = [], providerRatings, bookingCounts }) => {
  const rankedServices = rankServicesByQuery({ services, query: message, providerRatings, bookingCounts });
  const topScore = rankedServices[0]?.score || 0;
  const nextScore = rankedServices[1]?.score || 0;
  const detected = inferDetectedCategory(message, rankedServices);
  const preference = parsePreferenceFromQuery(message);
  const needsPreference = !preference && (!rankedServices[0] || topScore < 0.12 || (topScore - nextScore) < 0.05);

  const dynamicThreshold = Math.max(0.08, topScore * 0.55);
  const recommendationPool = rankedServices.filter(({ score }) => score >= dynamicThreshold).slice(0, 6);
  const orderedPool = applyPreferenceOrdering(
    recommendationPool.length > 0 ? recommendationPool : rankedServices.slice(0, 6),
    preference,
  );

  const recommendations = orderedPool
    .slice(0, 3)
    .map(({ service, score }) => buildRecommendationPayload(service, score))
    .filter(Boolean);
  const recommendation = recommendations[0] || null;

  return {
    message: buildAssistantMessage({
      rankedServices: orderedPool,
      language,
      needsPreference,
      preference,
      recommendationCount: recommendations.length,
    }),
    detectedService: detected.detectedService,
    confidence: Number(Math.max(detected.confidence, topScore).toFixed(3)),
    recommendedService: recommendation,
    recommendedServices: recommendations,
    needsPreference,
    preferenceOptions: buildPreferenceOptions(rankedServices, language),
    allScores: Object.fromEntries(
      rankedServices.slice(0, 8).map(({ service, score, similarity, categoryScore }) => [
        String(service._id),
        {
          score: Number(score.toFixed(3)),
          similarity: Number(similarity.toFixed(3)),
          categoryScore: Number(categoryScore.toFixed(3)),
        },
      ]),
    ),
    rankedServices,
  };
};

const buildDynamicSuggestions = ({ services = [], providerRatings, bookingCounts, language = 'en' }) => {
  const ranked = rankServicesByQuery({ services, query: '', providerRatings, bookingCounts });
  const suggestions = [];
  const seen = new Set();

  ranked.forEach(({ service }) => {
    if (!service || suggestions.length >= 5) {
      return;
    }

    const category = service.category || 'AUTRE';
    const categoryLabel = localizeCategory(category, language);
    const candidate = CATEGORY_SUGGESTIONS[language]?.[category]
      || (language === 'ar' ? `أحتاج مساعدة في ${categoryLabel}` : `I need help with ${categoryLabel}`);

    if (seen.has(candidate)) {
      return;
    }

    seen.add(candidate);
    suggestions.push(candidate);
  });

  if (suggestions.length < 5) {
    const fallbackCategories = ['PLOMBERIE', 'ELECTRICITE', 'CLIMATISATION', 'NETTOYAGE', 'AUTRE'];

    fallbackCategories.forEach((category) => {
      if (suggestions.length >= 5) {
        return;
      }

      const candidate = CATEGORY_SUGGESTIONS[language]?.[category];
      if (!candidate || seen.has(candidate)) {
        return;
      }

      seen.add(candidate);
      suggestions.push(candidate);
    });
  }

  return suggestions.slice(0, 5);
};

module.exports = {
  applyPreferenceOrdering,
  buildDynamicSuggestions,
  buildLocalChatbotResponse,
  buildRecommendationPayload,
  inferDetectedCategory,
  localizeCategory,
  normalizeText,
  parsePreferenceFromQuery,
  rankServicesByQuery,
  tokenizeText,
};