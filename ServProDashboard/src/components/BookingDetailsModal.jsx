import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const BookingDetailsModal = ({ booking, onClose, onUpdate }) => {
  const { t } = useTranslation();
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button type="button" aria-label="Close modal" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Booking details</p>
            <h2 className="display-title mt-1 text-2xl font-bold text-slate-900">{t('bookings.details.title')}</h2>
          </div>
          <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100" onClick={onClose}>×</button>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:px-8">
          <section className="rounded-2xl bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{t('bookings.details.serviceInfo')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.service')}</p>
                <p className="mt-1 font-semibold text-slate-900">{booking.service?.name ? t(booking.service.name) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.category')}</p>
                <p className="mt-1 font-semibold text-slate-900">{booking.service?.category ? t(`services.categories.${booking.service.category}`) : 'N/A'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{t('bookings.details.clientInfo')}</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.name')}</p>
                <p className="mt-1 font-semibold text-slate-900">{booking.client?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.email')}</p>
                <p className="mt-1 font-semibold text-slate-900">{booking.client?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.phone')}</p>
                <p className="mt-1 font-semibold text-slate-900">{booking.client?.phone || 'N/A'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{t('bookings.details.bookingInfo')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.expectedAt')}</p>
                <p className="mt-1 font-semibold text-slate-900">{new Date(booking.expectedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.status')}</p>
                <span className="mt-1 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{booking.status}</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.totalPrice')}</p>
                <p className="mt-1 text-lg font-extrabold text-slate-950">{booking.totalPrice} {booking.currency}</p>
              </div>
              {booking.detail?.address && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.address')}</p>
                  <p className="mt-1 font-semibold text-slate-900">{booking.detail.address}</p>
                </div>
              )}
              {booking.detail?.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase text-slate-400">{t('bookings.details.notes')}</p>
                  <p className="mt-1 font-semibold text-slate-900">{booking.detail.notes}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-5 sm:px-8">
          <button onClick={onClose} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
            {t('buttons.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

BookingDetailsModal.propTypes = {
  booking: PropTypes.shape({
    expectedAt: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    totalPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    currency: PropTypes.string,
    service: PropTypes.shape({
      name: PropTypes.string,
      category: PropTypes.string,
    }),
    client: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
    }),
    detail: PropTypes.shape({
      address: PropTypes.string,
      notes: PropTypes.string,
    }),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
};

export default BookingDetailsModal;
