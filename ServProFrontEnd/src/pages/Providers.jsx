import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiService from '../services/apiService';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';

const buildMapsSearchUrl = (...parts) => {
  const query = parts.filter(Boolean).join(' ').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'ServPro')}`;
};

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

const scoreProvider = (provider, query) => {
  const normalizedQuery = normalizeText(query);
  const haystack = normalizeText([
    provider.name,
    provider.email,
    provider.phone,
    provider.companyName,
    provider.location,
    provider.verificationStatus,
  ].join(' '));

  if (!normalizedQuery) {
    return provider.servicesCount * 0.3 + provider.portfoliosCount * 0.5 + (normalizeText(provider.verificationStatus).includes('verified') ? 2 : 0);
  }

  let score = 0;
  if (haystack.startsWith(normalizedQuery)) score += 4;
  if (haystack.includes(normalizedQuery)) score += 3;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedTokens = tokens.filter((token) => haystack.includes(token)).length;
  score += matchedTokens * 2;

  if (matchedTokens === tokens.length) {
    score += 2;
  }

  score += provider.servicesCount * 0.3;
  score += provider.portfoliosCount * 0.5;

  if (normalizeText(provider.verificationStatus).includes('verified')) {
    score += 1;
  }

  return score;
};

const Providers = () => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const normalizeItems = (response) => {
    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  };

  const firstNonEmpty = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== '');

  const formatLocation = (provider) => {
    const raw = firstNonEmpty(
      provider?.providerProfile?.location,
      provider?.location,
      provider?.address,
      provider?.city,
    );

    if (!raw) {
      return t('providers.noLocation');
    }

    if (typeof raw === 'string') {
      return raw;
    }

    if (typeof raw === 'object') {
      const values = Object.values(raw)
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);
      return values.join(', ') || t('providers.noLocation');
    }

    return t('providers.noLocation');
  };

  useEffect(() => {
    const loadProviders = async () => {
      setLoading(true);
      setError('');

      try {
        const [providersRes, servicesRes, portfoliosRes] = await Promise.all([
          apiService.get(API_ENDPOINTS.PROVIDERS),
          apiService.get(API_ENDPOINTS.SERVICES),
          apiService.get(API_ENDPOINTS.PORTFOLIOS),
        ]);

        const providersItems = normalizeItems(providersRes);
        const servicesItems = normalizeItems(servicesRes);
        const portfoliosItems = normalizeItems(portfoliosRes);

        const serviceCountByProvider = new Map();
        servicesItems.forEach((service) => {
          const providerId = typeof service.provider === 'object'
            ? (service.provider?._id || service.provider?.id)
            : service.provider;
          if (!providerId) return;
          const key = String(providerId);
          serviceCountByProvider.set(key, (serviceCountByProvider.get(key) || 0) + 1);
        });

        const portfolioCountByProvider = new Map();
        portfoliosItems.forEach((portfolio) => {
          const providerId = typeof portfolio.provider === 'object'
            ? (portfolio.provider?._id || portfolio.provider?.id)
            : portfolio.provider;
          if (!providerId) return;
          const key = String(providerId);
          portfolioCountByProvider.set(key, (portfolioCountByProvider.get(key) || 0) + 1);
        });

        const mapped = providersItems
          .map((provider) => {
            const id = String(provider._id || provider.id || '');
            if (!id) return null;
            return {
              id,
              name: provider.name || t('providers.fallbackName'),
              email: provider.email || '',
              phone: provider.phone || '',
              location: formatLocation(provider),
              companyName: provider.providerProfile?.companyName || '',
              verificationStatus: provider.providerProfile?.verificationStatus || '',
              servicesCount: serviceCountByProvider.get(id) || 0,
              portfoliosCount: portfolioCountByProvider.get(id) || 0,
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));

        setProviders(mapped);
      } catch (err) {
        setError(err.message || t('providers.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredBySegment = providers.filter((provider) => {
      const isVerified = normalizeText(provider.verificationStatus).includes('verified');
      const isActive = provider.servicesCount + provider.portfoliosCount >= 3;
      const isPortfolioRich = provider.portfoliosCount >= 2;

      if (activeFilter === 'verified' && !isVerified) return false;
      if (activeFilter === 'active' && !isActive) return false;
      if (activeFilter === 'portfolio' && !isPortfolioRich) return false;

      return true;
    });

    return filteredBySegment
      .map((provider) => ({ provider, score: scoreProvider(provider, q) }))
      .filter(({ score }) => (q ? score > 0 : true))
      .sort((left, right) => right.score - left.score)
      .map(({ provider }) => provider);
  }, [activeFilter, providers, search]);

  const analytics = useMemo(() => {
    const verified = providers.filter((provider) => normalizeText(provider.verificationStatus).includes('verified')).length;
    const averageServices = providers.length
      ? Math.round(providers.reduce((sum, provider) => sum + provider.servicesCount, 0) / providers.length)
      : 0;
    const topProvider = providers.slice().sort((left, right) => scoreProvider(right, '') - scoreProvider(left, ''))[0] || null;

    return {
      total: providers.length,
      verified,
      averageServices,
      topProvider,
    };
  }, [providers]);

  const featuredProvider = filteredProviders[0] || providers[0] || null;
  const featuredMapUrl = buildMapsSearchUrl(
    featuredProvider?.name,
    featuredProvider?.companyName,
    featuredProvider?.location,
  );
  const embeddedMapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
    [featuredProvider?.name, featuredProvider?.location].filter(Boolean).join(' ') || 'ServPro',
  )}&output=embed`;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">ServPro</p>
        <h1 className="display-title text-3xl font-extrabold text-slate-900 sm:text-4xl">
          {t('providers.businessesTitle', { defaultValue: 'Businesses' })}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{t('providers.businessesSubtitle', { defaultValue: t('providers.subtitle') })}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('providers.searchPlaceholder')}</p>
                <p className="mt-1 text-sm text-slate-600">{t('providers.shownCount', { count: filteredProviders.length })}</p>
              </div>
              <div className="w-full md:max-w-sm">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('providers.searchPlaceholder')}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: 'all', label: t('providers.filterAll', { defaultValue: 'All' }) },
                { key: 'verified', label: t('providers.filterVerified', { defaultValue: 'Verified' }) },
                { key: 'active', label: t('providers.filterActive', { defaultValue: 'High activity' }) },
                { key: 'portfolio', label: t('providers.filterPortfolio', { defaultValue: 'Portfolio rich' }) },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveFilter(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeFilter === item.key ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/10' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-lg shadow-sky-100/40">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{t('providers.total', { defaultValue: 'Total providers' })}</p>
              <p className="display-title mt-2 text-3xl font-extrabold text-slate-900">{analytics.total}</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-lg shadow-emerald-100/40">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{t('providers.verifiedCount', { defaultValue: 'Verified' })}</p>
              <p className="display-title mt-2 text-3xl font-extrabold text-slate-900">{analytics.verified}</p>
            </article>
            <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-lg shadow-violet-100/40">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t('providers.avgServices', { defaultValue: 'Avg. services' })}</p>
              <p className="display-title mt-2 text-3xl font-extrabold text-slate-900">{analytics.averageServices}</p>
            </article>
            <article className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-lg shadow-orange-100/40">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">{t('providers.topProvider', { defaultValue: 'Top provider' })}</p>
              <p className="mt-2 text-lg font-extrabold text-slate-900">{analytics.topProvider?.name || t('providers.noResults')}</p>
            </article>
          </div>

          {loading && <p className="text-slate-700">{t('providers.loading')}</p>}
          {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</p>}

          {!loading && !error && (
            <>
              <div className="space-y-4">
                {filteredProviders.map((provider) => {
                  const mapsUrl = buildMapsSearchUrl(provider.name, provider.companyName, provider.location);

                  return (
                    <article key={provider.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-xl">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-sm font-black text-teal-700">
                              {provider.name?.slice(0, 1)?.toUpperCase() || 'P'}
                            </div>
                            <div className="min-w-0">
                              <h2 className="truncate text-lg font-bold text-slate-900">{provider.name}</h2>
                              <p className="truncate text-sm text-slate-600">{provider.companyName || t('providers.company')}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                            <span className="rounded-full bg-slate-100 px-3 py-1">{t('providers.location')}: {provider.location}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">{t('providers.servicesCount')}: {provider.servicesCount}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">{t('providers.portfoliosCount')}: {provider.portfoliosCount}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">{provider.verificationStatus || t('providers.verification')}</span>
                          </div>

                          <div className="mt-4 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                            <p>{provider.email || t('providers.noEmail')}</p>
                            <p>{provider.phone || t('providers.noPhone')}</p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-3 sm:flex-col sm:items-end">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            {t('providers.directions', { defaultValue: 'Directions' })}
                          </a>
                          <Link
                            to={`/providers/${provider.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100"
                          >
                            {t('providers.viewProfile', { defaultValue: 'View profile' })}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!filteredProviders.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">{t('providers.noResults')}</p>}
            </>
          )}

          <p className="text-xs text-slate-500">{t('providers.apiLabel')}: {API_BASE_URL}</p>
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/5">
            <div className="flex items-start justify-between gap-4 p-5 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-600">{t('providers.mapTitle', { defaultValue: 'Map view' })}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{featuredProvider?.name || t('providers.title')}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t('providers.mapSubtitle', { defaultValue: 'Browse the current selection on the map and open directions instantly.' })}</p>
              </div>
              <a
                href={featuredMapUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {t('providers.openInMaps', { defaultValue: 'Open in Maps' })}
              </a>
            </div>

            <div className="px-5 pb-5">
              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                <iframe
                  title={t('providers.mapTitle', { defaultValue: 'Map view' })}
                  src={embeddedMapUrl}
                  className="h-[560px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Providers;
