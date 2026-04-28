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

const getCertificateFileName = (url, fallback) => {
  if (!url) return fallback;

  try {
    const parsed = new URL(url);
    const rawName = parsed.pathname.split('/').filter(Boolean).pop();
    return rawName || fallback;
  } catch {
    return fallback;
  }
};

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
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-8 text-white sm:px-8">
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

          {/* Content Sections */}
          <div className="px-6 py-8 sm:px-8">
            {/* Services & Portfolio Section */}
            {(services.length > 0 || portfolios.length > 0) && (
              <div className="mb-8 border-b border-slate-200 pb-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">{t('providerPortfolio.workTitle')}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t('providerPortfolio.workDescription', { defaultValue: 'Services and portfolio work' })}</p>
                </div>

                {services.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">{t('providerPortfolio.services')}</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {services.map((service) => (
                        <article key={service._id} className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
                          <h4 className="font-semibold text-slate-900">{resolveServiceName(t, service.name, 'Service')}</h4>
                          <p className="mt-1 text-sm text-slate-600">{t('providerPortfolio.category')}: {service.category || '-'}</p>
                          <p className="text-sm text-slate-600">{t('providerPortfolio.price')}: {service.priceMin ?? '-'} {service.currency || ''}</p>
                          <p className="text-sm text-slate-600">{t('providerPortfolio.duration')}: {t('providerPortfolio.minutes', { count: service.duration ?? 0 })}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {portfolios.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">{t('providerPortfolio.portfolio')}</h3>
                    <div className="space-y-4">
                      {portfolios.map((portfolio) => (
                        <article key={portfolio._id} className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
                          <h4 className="font-semibold text-slate-900">{portfolio.title || t('providerPortfolio.untitledWork')}</h4>
                          <p className="mt-2 text-sm text-slate-600">{portfolio.description || t('providerPortfolio.noDescription')}</p>
                          
                          {(Array.isArray(portfolio.images) ? portfolio.images : []).filter(Boolean).length > 0 && (
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
                          )}

                          {Array.isArray(portfolio.certificates) && portfolio.certificates.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">
                                {t('providerPortfolio.certificatesTitle')}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {portfolio.certificates.filter(Boolean).map((certificateUrl, index) => (
                                  <div
                                    key={`${portfolio._id}-certificate-${index}`}
                                    className="flex h-24 w-full flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                                  >
                                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">PDF</span>
                                    <span className="mt-1 line-clamp-2 font-semibold text-slate-900">
                                      {getCertificateFileName(certificateUrl, `${t('providerPortfolio.certificateFallback')} ${index + 1}`)}
                                    </span>

                                    <div className="mt-2 flex items-center gap-2">
                                      <a
                                        href={certificateUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                                      >
                                        {t('common.view', { defaultValue: 'Open PDF' })}
                                      </a>
                                      <a
                                        href={certificateUrl}
                                        download
                                        className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
                                      >
                                        {t('common.download', { defaultValue: 'Download PDF' })}
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Certifications Section */}
            {mergedCertificationItems.length > 0 && (
              <div className="mb-8 border-b border-slate-200 pb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">{t('providerPortfolio.certificatesTitle')}</h2>
                <div className="space-y-2">
                  {mergedCertificationItems.map((certification, index) => (
                    <article key={certification._id || `cert-${index}`} className="rounded-lg border border-slate-200 px-4 py-3 hover:border-slate-300 transition">
                      <p className="font-semibold text-slate-900">{certification.name || t('providerPortfolio.certificateFallback')}</p>
                      <p className="text-sm text-slate-600">{certification.authority || t('providerPortfolio.unknownAuthority')}</p>
                      {certification.expiresAt && <p className="text-sm text-slate-600">{t('providerPortfolio.expiresOn')}: {new Date(certification.expiresAt).toLocaleDateString()}</p>}
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Availability Section */}
            {availabilityByDay.some(day => day.slots.length > 0) && (
              <div>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">{t('providerPortfolio.availabilityTitle')}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{t('providerPortfolio.calendarTitle', { defaultValue: 'Calendar view' })}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t('providerPortfolio.calendarSubtitle', { defaultValue: 'Weekly schedule shown as a calendar-style grid.' })}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
                  {availabilityByDay.map(({ dayIndex, dayKey, slots }) => (
                    <article key={dayKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:border-slate-300 transition">
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
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ProviderPortfolio;
