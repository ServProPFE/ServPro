const humanizeServiceKey = (key) => {
  const withoutPrefix = key.replace(/^serviceNames\./, '');
  const withSpaces = withoutPrefix
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
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

  const translated = t(rawName);

  if (rawName.startsWith('serviceNames.')) {
    return translated !== rawName ? translated : humanizeServiceKey(rawName);
  }

  if (rawName.includes('.')) {
    return translated !== rawName ? translated : rawName;
  }

  return rawName;
};
