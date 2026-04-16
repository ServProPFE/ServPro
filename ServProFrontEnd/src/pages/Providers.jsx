import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';

const Providers = () => {
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        const providersItems = Array.isArray(providersRes?.items)
          ? providersRes.items
          : (Array.isArray(providersRes) ? providersRes : []);
        const servicesItems = Array.isArray(servicesRes?.items)
          ? servicesRes.items
          : (Array.isArray(servicesRes) ? servicesRes : []);
        const portfoliosItems = Array.isArray(portfoliosRes?.items)
          ? portfoliosRes.items
          : (Array.isArray(portfoliosRes) ? portfoliosRes : []);

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
              name: provider.name || 'Provider',
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
        setError(err.message || 'Failed to load providers');
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
        <h1 className="text-3xl font-bold text-slate-900">Providers</h1>
        <p className="mt-2 text-sm text-slate-600">Browse all users with provider role and open their portfolios.</p>
      </div>

      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search providers..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-teal-400 focus:outline-none"
        />
      </div>

      {loading && <p className="text-slate-700">Loading providers...</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{error}</p>}

      {!loading && !error && (
        <>
          <p className="mb-4 text-sm text-slate-600">{filteredProviders.length} providers shown</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map((provider) => (
              <article key={provider.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{provider.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{provider.email || 'No email'}</p>
                <p className="text-sm text-slate-600">{provider.phone || 'No phone'}</p>
                <p className="mt-2 text-sm text-slate-700">Company: {provider.companyName || '-'}</p>
                <p className="text-sm text-slate-700">Verification: {provider.verificationStatus || '-'}</p>
                <p className="text-sm text-slate-700">Services: {provider.servicesCount}</p>
                <p className="text-sm text-slate-700">Portfolios: {provider.portfoliosCount}</p>
                <Link
                  to={`/providers/${provider.id}`}
                  className="mt-4 inline-flex rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
                >
                  Open Portfolio
                </Link>
              </article>
            ))}
          </div>
          {!filteredProviders.length && <p className="text-slate-600">No providers found.</p>}
        </>
      )}

      <p className="mt-8 text-xs text-slate-500">API: {API_BASE_URL}</p>
    </section>
  );
};

export default Providers;
