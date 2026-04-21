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

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') return String(item.name || item.label || item.title || '').trim();
        return '';
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

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

const formatAvailabilityDay = (day, t) => {
  const dayNumber = Number(day);
  return Number.isInteger(dayNumber) && dayNumber >= 0 && dayNumber <= 6
    ? t(`providerPortfolio.days.${dayNumber}`)
    : t('providerPortfolio.unknownDay');
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
  const equipmentItems = normalizeList(firstNonEmpty(profile.equipments, profile.equipment));
  const teamItems = normalizeList(firstNonEmpty(profile.teamMembers, profile.team, profile.staff));
  const turnoverValue = firstNonEmpty(profile.chiffrement, profile.turnover);
  const mergedCertificationItems = [
    ...certifications,
    ...(profile.license ? [{ _id: 'license', name: t('providerPortfolio.license'), authority: profile.license }] : []),
    ...(profile.insurance ? [{ _id: 'insurance', name: t('providerPortfolio.insurance'), authority: profile.insurance }] : []),
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{provider?.name || t('providerPortfolio.title')}</h1>
        </div>
        <Link to="/providers" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          {t('providerPortfolio.backToProviders')}
        </Link>
      </div>

      {loading && <p className="text-slate-700">{t('providerPortfolio.loading')}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('providerPortfolio.profileTitle')}</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">{t('providerPortfolio.name')}:</span> {provider?.name || '-'}</p>
              <p><span className="font-semibold text-slate-900">{t('providerPortfolio.company')}:</span> {profile.companyName || '-'}</p>
              <p><span className="font-semibold text-slate-900">{t('providerPortfolio.email')}:</span> {provider?.email || '-'}</p>
              <p><span className="font-semibold text-slate-900">{t('providerPortfolio.phone')}:</span> {provider?.phone || '-'}</p>
              <p><span className="font-semibold text-slate-900">{t('providerPortfolio.location', { defaultValue: 'Location' })}:</span> {formatLocation(provider, t)}</p>
              <p><span className="font-semibold text-slate-900">{t('providerPortfolio.experience')}:</span> {t('providerPortfolio.years', { count: profile.experienceYears || 0 })}</p>
              <p><span className="font-semibold text-slate-900">{t('providerPortfolio.status')}:</span> {profile.verificationStatus || 'PENDING'}</p>
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
            <h2 className="text-xl font-semibold text-slate-900">{t('providerPortfolio.availabilityTitle')}</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availability.map((slot) => (
                <article key={slot._id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{formatAvailabilityDay(slot.day, t)}</p>
                  <p>{slot.start || '--:--'} - {slot.end || '--:--'}</p>
                </article>
              ))}
              {!availability.length && <p className="text-sm text-slate-700">{t('providerPortfolio.noAvailability')}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProviderPortfolio;
