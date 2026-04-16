import { useTranslation } from 'react-i18next';
import { resolveServiceName } from '../utils/serviceName';
import '../styles/BookingCard.css';

const BookingCard = ({ booking, onCancel, onReview, userType }) => {
  const { t } = useTranslation();
  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'yellow',
      CONFIRMED: 'blue',
      IN_PROGRESS: 'purple',
      DONE: 'green',
      CANCELLED: 'red',
    };
    return colors[status] || 'gray';
  };

  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const canReview = booking.status === 'DONE' && userType === 'CLIENT';

  return (
    <div className="booking-card">
      <div className="booking-header">
        <h3>{resolveServiceName(t, booking.service?.name, 'Service')}</h3>
        <span className={`status-badge ${getStatusColor(booking.status)}`}>
          {t(`booking.status.${booking.status}`)}
        </span>
      </div>

      <div className="booking-info">
        <div className="info-row">
          <span className="label">{t('booking.date')}:</span>
          <span className="value">
            {new Date(booking.expectedAt).toLocaleString()}
          </span>
        </div>

        {userType === 'CLIENT' && booking.provider && (
          <div className="info-row">
            <span className="label">{t('booking.provider')}:</span>
            <span className="value">{booking.provider.name}</span>
          </div>
        )}

        {userType === 'PROVIDER' && booking.client && (
          <div className="info-row">
            <span className="label">{t('booking.client')}:</span>
            <span className="value">{booking.client.name}</span>
          </div>
        )}

        <div className="info-row">
          <span className="label">{t('booking.price')}:</span>
          <span className="value price">
            {booking.totalPrice} {booking.currency}
          </span>
        </div>

        {booking.detail?.address && (
          <div className="info-row">
            <span className="label">{t('booking.address')}:</span>
            <span className="value">{booking.detail.address}</span>
          </div>
        )}
      </div>

      <div className="booking-actions">
        {canCancel && (
          <button
            onClick={() => onCancel(booking._id)}
            className="btn-cancel"
          >
            {t('booking.cancelButton')}
          </button>
        )}
        {canReview && (
          <button
            onClick={() => onReview(booking)}
            className="btn-review"
          >
            {t('reviews.leave')}
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingCard;
