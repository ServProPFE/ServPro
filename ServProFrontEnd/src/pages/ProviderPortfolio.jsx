import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiService from '../services/apiService';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';
import { resolveServiceName } from '../utils/serviceName';

const toArray = (response) => {
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response)) return response;
  return [];
};

const firstNonEmpty = (...values) => values.find((value) => value !== null && value !== undefined && String(value).trim() !== '');

const DAY_DEFINITIONS = [
  { dayIndex: 0, dayKey: 'sunday' },
  { dayIndex: 1, dayKey: 'monday' },
  { dayIndex: 2, dayKey: 'tuesday' },
  { dayIndex: 3, dayKey: 'wednesday' },
  { dayIndex: 4, dayKey: 'thursday' },
  { dayIndex: 5, dayKey: 'friday' },
  { dayIndex: 6, dayKey: 'saturday' },
];

const formatLocation = (provider, t) => {
  const profile = provider?.providerProfile || {};
  const raw = firstNonEmpty(profile.location, provider?.location, provider?.address, provider?.city);

  if (!raw) return t('providerPortfolio.notProvided');
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const values = Object.values(raw)
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    return values.join(', ') || t('providerPortfolio.notProvided');
  }

  return t('providerPortfolio.notProvided');
};

const ProviderPortfolio = () => {
  const { providerId } = useParams();
  const { t } = useTranslation();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPortfolio = async () => {
      setLoading(true);
      setError('');

      try {
        const [providersRes, servicesRes, portfoliosRes] = await Promise.all([
          apiService.get(API_ENDPOINTS.PROVIDERS),
          apiService.get(`${API_ENDPOINTS.SERVICES}?providerId=${encodeURIComponent(providerId)}`),
          apiService.get(`${API_ENDPOINTS.PORTFOLIOS}?providerId=${encodeURIComponent(providerId)}`),
        ]);

        const [availabilityRes, certificationsRes] = await Promise.allSettled([
          apiService.get(`${API_ENDPOINTS.AVAILABILITY}?providerId=${encodeURIComponent(providerId)}`),
          apiService.get(`${API_BASE_URL}/certifications?providerId=${encodeURIComponent(providerId)}`),
        ]);

        const providersItems = toArray(providersRes);

        const currentProvider = providersItems.find((item) => String(item._id || item.id) === String(providerId));
        setProvider(currentProvider || null);

        setServices(toArray(servicesRes));
        setPortfolios(toArray(portfoliosRes));
        setAvailability(availabilityRes.status === 'fulfilled' ? toArray(availabilityRes.value) : []);
        setCertifications(certificationsRes.status === 'fulfilled' ? toArray(certificationsRes.value) : []);
      } catch (err) {
        setError(err.message || t('providerPortfolio.loadError'));
      } finally {
        setLoading(false);
      }
    };

    if (providerId) {
      loadPortfolio();
    }
  }, [providerId, t]);

  const profile = provider?.providerProfile || {};
  const turnoverValue = firstNonEmpty(profile.chiffrement, profile.turnover);
  const mergedCertificationItems = [
    ...certifications,
    ...(profile.license ? [{ _id: 'license', name: t('providerPortfolio.license'), authority: profile.license }] : []),
    ...(profile.insurance ? [{ _id: 'insurance', name: t('providerPortfolio.insurance'), authority: profile.insurance }] : []),
  ];

  const availabilityByDay = DAY_DEFINITIONS.map((day) => ({
    ...day,
    slots: availability.filter((slot) => Number(slot.day) === day.dayIndex),
  }));

  const profileInitial = (provider?.name || t('providerPortfolio.title') || 'P').slice(0, 1).toUpperCase();

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">ServPro</p>
          <h1 className="display-title mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('providerPortfolio.profileTitle')}</h1>
        </div>
        <Link to="/providers" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          {t('providerPortfolio.backToProviders')}
        </Link>
      </div>

      {loading && <p className="text-slate-700">{t('providerPortfolio.loading')}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-6">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-6 text-white sm:px-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white/10 text-2xl font-black uppercase text-white ring-1 ring-white/20">
                    {profileInitial}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">{t('providerPortfolio.profileTitle')}</p>
                    <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{provider?.name || t('providerPortfolio.title')}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      {profile.companyName || t('providerPortfolio.company')}
                      {provider?.email ? ` · ${provider.email}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-100 ring-1 ring-white/15">
                    {profile.verificationStatus || 'PENDING'}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 ring-1 ring-white/15">
                    {t('providerPortfolio.years', { count: profile.experienceYears || 0 })}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{t('providerPortfolio.email')}</p>
                  <p className="mt-2 text-sm font-medium text-white">{provider?.email || '-'}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{t('providerPortfolio.phone')}</p>
                  <p className="mt-2 text-sm font-medium text-white">{provider?.phone || '-'}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{t('providerPortfolio.locationTitle')}</p>
                  <p className="mt-2 text-sm font-medium text-white">{formatLocation(provider, t)}</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{t('providerPortfolio.turnoverTitle')}</p>
                  <p className="mt-2 text-sm font-medium text-white">{turnoverValue || t('providerPortfolio.notProvided')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('providerPortfolio.workTitle')}</h2>
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('providerPortfolio.services')}</h3>
              {services.map((service) => (
                <article key={service._id} className="rounded-xl border border-slate-200 p-3">
                  <h3 className="font-semibold text-slate-900">{resolveServiceName(t, service.name, 'Service')}</h3>
                  <p className="text-sm text-slate-600">{t('providerPortfolio.category')}: {service.category || '-'}</p>
                  <p className="text-sm text-slate-600">{t('providerPortfolio.price')}: {service.priceMin ?? '-'} {service.currency || ''}</p>
                  <p className="text-sm text-slate-600">{t('providerPortfolio.duration')}: {t('providerPortfolio.minutes', { count: service.duration ?? 0 })}</p>
                </article>
              ))}
              {!services.length && <p className="text-sm text-slate-600">{t('providerPortfolio.noServices')}</p>}

              <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{t('providerPortfolio.portfolio')}</h3>
              {portfolios.map((portfolio) => (
                <article key={portfolio._id} className="rounded-xl border border-slate-200 p-3">
                  <h3 className="font-semibold text-slate-900">{portfolio.title || t('providerPortfolio.untitledWork')}</h3>
                  <p className="text-sm text-slate-600">{portfolio.description || t('providerPortfolio.noDescription')}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(Array.isArray(portfolio.images) ? portfolio.images : []).filter(Boolean).map((imageUrl, index) => (
                      <img
                        key={`${portfolio._id}-${index}`}
                        src={imageUrl}
                        alt={t('providerPortfolio.portfolioImageAlt')}
                        className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </article>
              ))}
              {!portfolios.length && <p className="text-sm text-slate-600">{t('providerPortfolio.noPortfolio')}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('providerPortfolio.certificatesTitle')}</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {mergedCertificationItems.map((certification, index) => (
                <article key={certification._id || `cert-${index}`} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="font-semibold text-slate-900">{certification.name || t('providerPortfolio.certificateFallback')}</p>
                  <p>{certification.authority || t('providerPortfolio.unknownAuthority')}</p>
                  {certification.expiresAt && <p>{t('providerPortfolio.expiresOn')}: {new Date(certification.expiresAt).toLocaleDateString()}</p>}
                </article>
              ))}
              {!mergedCertificationItems.length && <p>{t('providerPortfolio.noCertificates')}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">{t('providerPortfolio.availabilityTitle')}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{t('providerPortfolio.calendarTitle', { defaultValue: 'Calendar view' })}</h2>
              </div>
              <p className="text-sm text-slate-500">{t('providerPortfolio.calendarSubtitle', { defaultValue: 'Weekly schedule shown as a calendar-style grid.' })}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
              {availabilityByDay.map(({ dayIndex, dayKey, slots }) => (
                <article key={dayKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{t(`providerPortfolio.days.${dayIndex}`)}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {slots.length}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {slots.length > 0 ? slots.map((slot) => (
                      <div key={slot._id} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                        <p className="font-semibold text-slate-900">{slot.start || '--:--'} - {slot.end || '--:--'}</p>
                      </div>
                    )) : (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-sm text-slate-500">
                        {t('providerPortfolio.noAvailability')}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProviderPortfolio;
