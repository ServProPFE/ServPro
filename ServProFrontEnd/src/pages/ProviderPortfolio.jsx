import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiService from '../services/apiService';
import API_BASE_URL, { API_ENDPOINTS } from '../config/api';
import { resolveServiceName } from '../utils/serviceName';

const DAY_LABELS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

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

const formatLocation = (provider) => {
  const profile = provider?.providerProfile || {};
  const raw = firstNonEmpty(profile.location, provider?.location, provider?.address, provider?.city);

  if (!raw) return 'Non renseigné';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const values = Object.values(raw)
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    return values.join(', ') || 'Non renseigné';
  }

  return 'Non renseigné';
};

const formatAvailabilityDay = (day) => {
  const dayNumber = Number(day);
  return Number.isInteger(dayNumber) && dayNumber >= 0 && dayNumber <= 6 ? DAY_LABELS_FR[dayNumber] : 'Jour inconnu';
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
        setError(err.message || 'Failed to load provider portfolio');
      } finally {
        setLoading(false);
      }
    };

    if (providerId) {
      loadPortfolio();
    }
  }, [providerId]);

  const profile = provider?.providerProfile || {};
  const equipmentItems = normalizeList(firstNonEmpty(profile.equipments, profile.equipment));
  const teamItems = normalizeList(firstNonEmpty(profile.teamMembers, profile.team, profile.staff));
  const turnoverValue = firstNonEmpty(profile.chiffrement, profile.turnover);
  const mergedCertificationItems = [
    ...certifications,
    ...(profile.license ? [{ _id: 'license', name: 'Licence', authority: profile.license }] : []),
    ...(profile.insurance ? [{ _id: 'insurance', name: 'Assurance', authority: profile.insurance }] : []),
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{provider?.name || 'Provider Portfolio'}</h1>
          <p className="mt-2 text-sm text-slate-600">Provider ID: {providerId}</p>
        </div>
        <Link to="/providers" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back to providers
        </Link>
      </div>

      {loading && <p className="text-slate-700">Loading portfolio...</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Info Artisant</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Nom:</span> {provider?.name || '-'}</p>
              <p><span className="font-semibold text-slate-900">Entreprise:</span> {profile.companyName || '-'}</p>
              <p><span className="font-semibold text-slate-900">Email:</span> {provider?.email || '-'}</p>
              <p><span className="font-semibold text-slate-900">Téléphone:</span> {provider?.phone || '-'}</p>
              <p><span className="font-semibold text-slate-900">Expérience:</span> {profile.experienceYears || 0} ans</p>
              <p><span className="font-semibold text-slate-900">Statut:</span> {profile.verificationStatus || 'PENDING'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Mes réalisations</h2>
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Services</h3>
              {services.map((service) => (
                <article key={service._id} className="rounded-xl border border-slate-200 p-3">
                  <h3 className="font-semibold text-slate-900">{resolveServiceName(t, service.name, 'Service')}</h3>
                  <p className="text-sm text-slate-600">Category: {service.category || '-'}</p>
                  <p className="text-sm text-slate-600">Price: {service.priceMin ?? '-'} {service.currency || ''}</p>
                  <p className="text-sm text-slate-600">Duration: {service.duration ?? '-'} min</p>
                </article>
              ))}
              {!services.length && <p className="text-sm text-slate-600">No services found for this provider.</p>}

              <h3 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Portfolio</h3>
              {portfolios.map((portfolio) => (
                <article key={portfolio._id} className="rounded-xl border border-slate-200 p-3">
                  <h3 className="font-semibold text-slate-900">{portfolio.title || 'Réalisation sans titre'}</h3>
                  <p className="text-sm text-slate-600">{portfolio.description || 'Pas de description'}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(Array.isArray(portfolio.images) ? portfolio.images : []).filter(Boolean).map((imageUrl, index) => (
                      <img
                        key={`${portfolio._id}-${index}`}
                        src={imageUrl}
                        alt="Portfolio"
                        className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                </article>
              ))}
              {!portfolios.length && <p className="text-sm text-slate-600">Aucune réalisation trouvée pour ce prestataire.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Localisation</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Adresse:</span> {formatLocation(provider)}</p>
              <p><span className="font-semibold text-slate-900">Rayon d'intervention:</span> {profile.serviceRadius || 0} km</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Mon équipe</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {teamItems.map((item) => (
                <p key={`team-${item}`} className="rounded-lg bg-slate-50 px-3 py-2">{item}</p>
              ))}
              {!teamItems.length && <p>Non renseigné</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Mes équipements</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {equipmentItems.map((item) => (
                <p key={`equipment-${item}`} className="rounded-lg bg-slate-50 px-3 py-2">{item}</p>
              ))}
              {!equipmentItems.length && <p>Non renseigné</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Mes certificats</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {mergedCertificationItems.map((certification, index) => (
                <article key={certification._id || `cert-${index}`} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="font-semibold text-slate-900">{certification.name || 'Certificat'}</p>
                  <p>{certification.authority || 'Autorité non renseignée'}</p>
                  {certification.expiresAt && <p>Expire le: {new Date(certification.expiresAt).toLocaleDateString('fr-FR')}</p>}
                </article>
              ))}
              {!mergedCertificationItems.length && <p>Aucun certificat disponible</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Chiffrement</h2>
            <p className="mt-4 text-sm text-slate-700">{turnoverValue || 'Non renseigné'}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-semibold text-slate-900">Disponibilités (horaire)</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availability.map((slot) => (
                <article key={slot._id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{formatAvailabilityDay(slot.day)}</p>
                  <p>{slot.start || '--:--'} - {slot.end || '--:--'}</p>
                </article>
              ))}
              {!availability.length && <p className="text-sm text-slate-700">Aucune disponibilité renseignée</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProviderPortfolio;
