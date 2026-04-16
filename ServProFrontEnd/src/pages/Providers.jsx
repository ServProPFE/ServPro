import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiService from '../services/apiService';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';

const Providers = () => {
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
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
    if (!q) return providers;
    return providers.filter((provider) => provider.name.toLowerCase().includes(q));
  }, [providers, search]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{t('providers.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('providers.subtitle')}</p>
      </div>

      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('providers.searchPlaceholder')}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-400 focus:outline-none"
        />
      </div>

      {loading && <p className="text-slate-700">{t('providers.loading')}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{error}</p>}

      {!loading && !error && (
        <>
          <p className="mb-4 text-sm text-slate-600">{t('providers.shownCount', { count: filteredProviders.length })}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map((provider) => (
              <article key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{provider.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{provider.email || t('providers.noEmail')}</p>
                <p className="text-sm text-slate-600">{provider.phone || t('providers.noPhone')}</p>
                <p className="mt-2 text-sm text-slate-700">{t('providers.company')}: {provider.companyName || '-'}</p>
                <p className="text-sm text-slate-700">{t('providers.verification')}: {provider.verificationStatus || '-'}</p>
                <p className="text-sm text-slate-700">{t('providers.servicesCount')}: {provider.servicesCount}</p>
                <p className="text-sm text-slate-700">{t('providers.portfoliosCount')}: {provider.portfoliosCount}</p>
                <Link
                  to={`/providers/${provider.id}`}
                  className="mt-4 inline-flex rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
                >
                  {t('providers.openPortfolio')}
                </Link>
              </article>
            ))}
          </div>
          {!filteredProviders.length && <p className="text-slate-600">{t('providers.noResults')}</p>}
        </>
      )}

      <p className="mt-8 text-xs text-slate-500">{t('providers.apiLabel')}: {API_BASE_URL}</p>
    </section>
  );
};

export default Providers;
