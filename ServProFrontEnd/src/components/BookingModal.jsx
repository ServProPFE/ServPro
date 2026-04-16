import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { resolveServiceName } from '../utils/serviceName';
import PropTypes from 'prop-types';

const BookingModal = ({ service, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    expectedAt: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeOffer, setActiveOffer] = useState(null);

  const resolveRefId = (value) => {
    if (!value) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return value._id || value.id;
    }
    return undefined;
  };

  useEffect(() => {
    const fetchActiveOffer = async () => {
      try {
        const data = await apiService.get(`${API_ENDPOINTS.OFFERS}?serviceId=${service._id}&active=true`);
        let offersArray = [];
        if (Array.isArray(data?.items)) {
          offersArray = data.items;
        } else if (Array.isArray(data)) {
          offersArray = data;
        }
        const now = new Date();

        const validOffer = offersArray
          .filter((offer) => !offer.validUntil || new Date(offer.validUntil) >= now)
          .sort((a, b) => (Number(b.discount || 0) - Number(a.discount || 0)))[0] || null;

        setActiveOffer(validOffer);
      } catch {
        setActiveOffer(null);
      }
    };

    fetchActiveOffer();
  }, [service._id]);

  const priceInfo = useMemo(() => {
    const basePrice = Number(activeOffer?.basePrice ?? service.priceMin ?? 0);
    const discount = Math.max(0, Math.min(Number(activeOffer?.discount ?? 0), 100));
    const total = Math.round((basePrice * (1 - discount / 100) + Number.EPSILON) * 100) / 100;

    return {
      basePrice,
      discount,
      total,
      hasDiscount: discount > 0,
    };
  }, [activeOffer, service.priceMin]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const clientId = resolveRefId(user);
      const providerId = resolveRefId(service.provider);

      if (!clientId || !providerId) {
        throw new Error(t('booking.error'));
      }

      // First create reservation detail
      const detailData = await apiService.post(API_ENDPOINTS.RESERVATION_DETAILS, {
        address: formData.address,
        description: formData.notes,
        urgent: false,
      });

      // Then create booking
      await apiService.post(API_ENDPOINTS.BOOKINGS, {
        client: clientId,
        service: service._id,
        provider: providerId,
        expectedAt: formData.expectedAt,
        totalPrice: priceInfo.total,
        currency: service.currency,
        detail: detailData._id,
      });

      onSuccess();
    } catch (err) {
      setError(err.message || t('booking.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Booking</p>
            <h2 className="display-title mt-1 text-2xl font-bold text-slate-900">{t('booking.title', { name: resolveServiceName(t, service.name) })}</h2>
          </div>
          <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100" onClick={onClose}>×</button>
        </div>

        <div className="px-6 py-6 sm:px-8">
          {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="expectedAt" className="text-sm font-semibold text-slate-700">{t('booking.dateTime')}</label>
              <input
                type="datetime-local"
                id="expectedAt"
                name="expectedAt"
                value={formData.expectedAt}
                onChange={handleChange}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-semibold text-slate-700">{t('booking.address')}</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                placeholder={t('booking.addressPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-semibold text-slate-700">{t('booking.notes')}</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                placeholder={t('booking.notesPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{t('booking.totalPrice')}:</span>
                <span className="text-lg font-extrabold text-slate-950">{priceInfo.total} {service.currency}</span>
              </div>

              {priceInfo.hasDiscount && (
                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>{t('offers.discount', { value: priceInfo.discount })}</span>
                  <span className="line-through">{priceInfo.basePrice} {service.currency}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                {t('booking.cancel')}
              </button>
              <button type="submit" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
                {loading ? t('booking.booking') : t('booking.confirm')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

BookingModal.propTypes = {
  service: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    priceMin: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    currency: PropTypes.string,
    provider: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        _id: PropTypes.string,
      }),
    ]),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default BookingModal;
