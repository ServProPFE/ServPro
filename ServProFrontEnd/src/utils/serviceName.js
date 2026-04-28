const humanizeServiceKey = (key) => {
  const withoutPrefix = key.replace(/^services?Names\./, '');
  const withSpaces = withoutPrefix
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('.', ' ')
    .replaceAll('-', ' ')
    .trim();

  if (!withSpaces) {
    return 'Service';
  }

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

export const resolveServiceName = (t, rawName, fallback = 'Service') => {
  if (!rawName || typeof rawName !== 'string') {
    return fallback;
  }

  const normalizedName = rawName.startsWith('servicesNames.')
    ? rawName.replace(/^servicesNames\./, 'serviceNames.')
    : rawName;
  const translated = t(normalizedName);

  if (/^services?Names\./.test(rawName)) {
    if (translated !== normalizedName) {
      return translated;
    }

    return humanizeServiceKey(normalizedName);
  }

  if (rawName.includes('.')) {
    if (translated !== rawName) {
      return translated;
    }

    return rawName;
  }

  return rawName;
};
