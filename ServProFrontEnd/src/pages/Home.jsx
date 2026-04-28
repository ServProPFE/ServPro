import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import ServiceCard from '../components/ServiceCard';
import SearchBar from '../components/SearchBar';
import { filterServicesBySearch } from '../utils/serviceSearch';

const normalizeItems = (payload) => {
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const [services, setServices] = useState([]);
  const [offers, setOffers] = useState([]);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredServices, setFilteredServices] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        setSuggestionsLoading(true);
        const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
        const payload = await apiService.get(`${API_ENDPOINTS.CHATBOT_SUGGESTIONS}?language=${language}`);
        let suggestions = [];

        if (Array.isArray(payload?.suggestions)) {
          suggestions = payload.suggestions;
        } else if (Array.isArray(payload?.[language])) {
          suggestions = payload[language];
        } else if (Array.isArray(payload?.en)) {
          suggestions = payload.en;
        }

        setSmartSuggestions(suggestions);
      } catch (suggestionError) {
        console.error('Error fetching smart suggestions:', suggestionError);
        setSmartSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    loadSuggestions();
  }, [i18n.language]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesData, offersData] = await Promise.all([
        apiService.get(API_ENDPOINTS.SERVICES),
        apiService.get(API_ENDPOINTS.ACTIVE_OFFERS),
      ]);
      
      // Backend returns { items: [...] }, handle both formats
      const servicesArray = normalizeItems(servicesData);
      const offersArray = normalizeItems(offersData);
      
      setServices(servicesArray);
      setFilteredServices(servicesArray);
      setOffers(offersArray);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      // Ensure states remain as arrays even on error
      setServices([]);
      setFilteredServices([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm, category) => {
    const filtered = filterServicesBySearch({
      services,
      searchTerm,
      category,
      t,
    });

    setFilteredServices(filtered);
  };

  const applySmartSuggestion = (suggestion) => {
    const filtered = filterServicesBySearch({
      services,
      searchTerm: suggestion,
      category: 'ALL',
      t,
    });

    setFilteredServices(filtered);
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  const heroStats = [
    { label: t('home.stats.services', { defaultValue: 'Professional Services' }), value: services.length },
    { label: t('home.stats.offers', { defaultValue: 'Active Offers' }), value: offers.length },
    { label: t('home.stats.support', { defaultValue: 'Support' }), value: t('home.stats.supportValue', { defaultValue: '24/7' }) },
  ];

  const valuePillars = [
    {
      title: t('home.pillars.qualityTitle', { defaultValue: 'Verified Quality' }),
      description: t('home.pillars.qualityDescription', { defaultValue: 'Providers are reviewed with transparent ratings and profile history.' }),
    },
    {
      title: t('home.pillars.speedTitle', { defaultValue: 'Fast Booking' }),
      description: t('home.pillars.speedDescription', { defaultValue: 'Book services in minutes with clear pricing and real-time status flow.' }),
    },
    {
      title: t('home.pillars.coverageTitle', { defaultValue: 'Wide Coverage' }),
      description: t('home.pillars.coverageDescription', { defaultValue: 'From plumbing to cleaning, find the right expert for every task.' }),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-14 px-4 pb-20 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 px-6 py-14 text-white shadow-2xl shadow-slate-900/30 sm:px-10 lg:px-12">
        <div className="absolute -left-10 top-6 h-56 w-56 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative z-10 grid items-end gap-8 lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
              {t('home.badge', { defaultValue: 'Trusted Home Service Platform' })}
            </p>
            <h1 className="display-title text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-sm text-slate-100/90 sm:text-base">
              {t('hero.subtitle')}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/services"
                className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                {t('home.ctaPrimary', { defaultValue: 'Browse services' })}
              </Link>
              <Link
                to="/providers"
                className="inline-flex items-center rounded-xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              >
                {t('home.ctaSecondary', { defaultValue: 'Meet providers' })}
              </Link>
            </div>
          </div>

          <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-100/80">
              {t('home.quickSearch', { defaultValue: 'Quick Search' })}
            </p>
            <div className="mt-3 rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{t('home.smartTitle', { defaultValue: 'Smart suggestions' })}</p>
                  <p className="text-xs text-slate-100/80">{t('home.smartSubtitle', { defaultValue: 'Tap a suggestion to refine your search instantly' })}</p>
                </div>
                {suggestionsLoading ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100">
                    {t('home.smartLoading', { defaultValue: 'Loading smart suggestions...' })}
                  </span>
                ) : null}
              </div>

              {smartSuggestions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {smartSuggestions.slice(0, 4).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => applySmartSuggestion(suggestion)}
                      className="rounded-full border border-white/20 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-100/80">
                  {t('home.smartFallback', { defaultValue: 'Suggestions based on popular service requests' })}
                </p>
              )}
            </div>
            <div className="mt-3">
              <SearchBar onSearch={handleSearch} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {heroStats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-900/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
            <p className="display-title mt-3 text-3xl font-extrabold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="display-title text-2xl font-bold text-slate-900 sm:text-3xl">
            {t('home.whyTitle', { defaultValue: 'Why choose ServPro' })}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {valuePillars.map((pillar) => (
            <article key={pillar.title} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <h3 className="display-title text-lg font-bold text-slate-900">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      {offers.length > 0 && (
        <section>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="display-title text-2xl font-bold text-slate-900 sm:text-3xl">{t('offers.title')}</h2>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
              {t('home.offersTag', { defaultValue: 'Limited Time' })}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offers.map(offer => (
              <article key={offer._id} className="rounded-2xl border border-orange-200 bg-gradient-to-br from-white to-orange-50 p-5 shadow-lg shadow-orange-200/30">
                <div className="mb-3 inline-flex rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                  {t('offers.discount', { value: offer.discount })}
                </div>
                <h3 className="display-title text-lg font-bold text-slate-900">{t(offer.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{offer.description}</p>
                <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('offers.validUntil', { date: new Date(offer.validUntil).toLocaleDateString() })}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="display-title text-2xl font-bold text-slate-900 sm:text-3xl">{t('services.title')}</h2>
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">
            {filteredServices.length} {t('services.title')}
          </span>
        </div>

        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map(service => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>

        {filteredServices.length === 0 && (
          <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            {t('services.noResults')}
          </p>
        )}
      </section>
    </div>
  );
};

export default Home;
