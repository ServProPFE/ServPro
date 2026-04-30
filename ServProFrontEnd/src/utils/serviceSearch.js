import { resolveServiceName } from './serviceName';

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
    .toLowerCase()
    .trim();
};

const removeStopwords = (tokens) => tokens.filter((token) => !STOPWORDS.has(token) && token.length > 1);

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
  ];
};

const buildServiceSearchText = (service, t) => {
  const categoryCode = service?.category || '';
  const translatedCategory = categoryCode ? t(`services.categories.${categoryCode}`) : '';
  const serviceName = resolveServiceName(t, service?.name);

  const fields = [
    serviceName,
    service?.name,
    service?.description,
    categoryCode,
    translatedCategory,
    service?.priceMin,
    service?.priceMax,
    service?.currency,
    service?.duration,
    `${service?.priceMin || ''} ${service?.currency || ''}`,
    `${service?.duration || ''} min`,
    ...extractProviderFields(service?.provider),
  ];

  return normalizeText(fields.filter(Boolean).join(' '));
};

const scoreServiceSearchMatch = (service, searchTokens, normalizedSearch, t) => {
  if (searchTokens.length === 0) {
    return 0;
  }

  const haystack = buildServiceSearchText(service, t);
  let score = 0;

  const matchedTokens = searchTokens.filter((token) => haystack.includes(token)).length;
  score += matchedTokens * (100 / (searchTokens.length || 1));

  if (matchedTokens > 0) {
    score += 15;
  }

  score += Number(service?.priceMin || 0) > 0 ? 0.25 : 0;
  score += Number(service?.duration || 0) > 0 ? 0.25 : 0;

  return score;
};

export const filterServicesBySearch = ({ services, searchTerm, category = 'ALL', t }) => {
  const normalizedCategory = category || 'ALL';
  const normalizedSearch = normalizeText(searchTerm);
  const rawTokens = normalizedSearch ? normalizedSearch.split(/\s+/).filter(Boolean) : [];
  const searchTokens = removeStopwords(rawTokens);

  const matchedServices = (services || []).filter((service) => {
    if (normalizedCategory !== 'ALL' && service?.category !== normalizedCategory) {
      return false;
    }

    if (searchTokens.length === 0) {
      return true;
    }

    const haystack = buildServiceSearchText(service, t);
    return searchTokens.some((token) => haystack.includes(token));
  });

  if (searchTokens.length === 0) {
    return matchedServices;
  }

  return matchedServices
    .map((service) => ({
      service,
      score: scoreServiceSearchMatch(service, searchTokens, normalizedSearch, t),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ service }) => service);
};
