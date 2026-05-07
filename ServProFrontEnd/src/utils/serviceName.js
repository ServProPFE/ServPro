const humanizeServiceKey = (key) => {
  const withoutPrefix = key.replace(/^(services?Names\.)+/i, '');
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

  const normalizedName = rawName.replace(/^(services?Names\.)+/i, 'serviceNames.');
  const translated = t(normalizedName, { defaultValue: humanizeServiceKey(normalizedName) });

  if (/^services?Names\./.test(rawName)) {
    if (translated && translated !== normalizedName) {
      return translated;
    }

    return humanizeServiceKey(normalizedName);
  }

  if (rawName.includes('.')) {
    if (translated && translated !== rawName) {
      return translated;
    }

    return humanizeServiceKey(rawName);
  }

  return translated || humanizeServiceKey(rawName);
};
