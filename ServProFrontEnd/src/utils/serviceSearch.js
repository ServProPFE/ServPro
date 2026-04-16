import { resolveServiceName } from './serviceName';

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

export const filterServicesBySearch = ({ services, searchTerm, category = 'ALL', t }) => {
  const normalizedCategory = category || 'ALL';
  const normalizedSearch = normalizeText(searchTerm);
  const searchTokens = normalizedSearch ? normalizedSearch.split(/\s+/).filter(Boolean) : [];

  return (services || []).filter((service) => {
    if (normalizedCategory !== 'ALL' && service?.category !== normalizedCategory) {
      return false;
    }

    if (searchTokens.length === 0) {
      return true;
    }

    const haystack = buildServiceSearchText(service, t);
    return searchTokens.every((token) => haystack.includes(token));
  });
};
