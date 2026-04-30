import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import BookingCard from '../components/BookingCard';
import ReviewModal from '../components/ReviewModal';
import '../styles/MyBookings.css';

const MyBookings = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { user } = useAuth();
  const location = useLocation();

  const statuses = ['ALL', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const clientId = user?._id || user?.id;
      if (!clientId) {
        setBookings([]);
        return;
      }
      const endpoint = user?.type === 'PROVIDER'
        ? API_ENDPOINTS.MY_PROVIDER_BOOKINGS(clientId)
        : API_ENDPOINTS.MY_BOOKINGS(clientId);
      const data = await apiService.get(endpoint);
      // Backend returns { items: [...] }
      const bookingsArray = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
      setBookings(bookingsArray);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings, location.key]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(t('booking.cancelConfirm'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.BOOKING_BY_ID(bookingId));
      fetchBookings();
    } catch (err) {
      alert(`${t('booking.cancelError')}: ${err.message}`);
    }
  };

  const handleReview = (booking) => {
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  const handleReviewSubmitted = () => {
    alert(t('reviews.thanks'));
    fetchBookings();
  };

  const filteredBookings = filter === 'ALL'
    ? bookings
    : bookings.filter(booking => booking.status === filter);

  if (loading) {
    return <div className="loading">{t('booking.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="my-bookings">
      <div className="bookings-header">
        <h1>{t('booking.myBookings')}</h1>
        <div className="status-filters">
          {statuses.map(status => (
            <button
              key={status}
              className={`filter-btn ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status === 'ALL' ? t('booking.statusAll') : t(`booking.status.${status}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="bookings-list">
        {filteredBookings.length > 0 ? (
          filteredBookings.map(booking => (
            <BookingCard
              key={booking._id}
              booking={booking}
              onCancel={handleCancelBooking}
              onReview={handleReview}
              userType={user?.type}
            />
          ))
        ) : (
          <div className="no-bookings">
            <p>{t('booking.none')}</p>
          </div>
        )}
      </div>

      {showReviewModal && selectedBooking && (
        <ReviewModal
          booking={selectedBooking}
          onClose={() => setShowReviewModal(false)}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default MyBookings;
