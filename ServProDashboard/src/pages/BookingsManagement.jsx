import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import BookingDetailsModal from '../components/BookingDetailsModal';
import '../styles/Bookings.css';

const BookingsManagement = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const statuses = ['ALL', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [filter, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.BOOKINGS);
      // Backend returns { items: [...] }
      let bookingsArray = [];
      if (Array.isArray(data?.items)) {
        bookingsArray = data.items;
      } else if (Array.isArray(data)) {
        bookingsArray = data;
      }
      setBookings(bookingsArray);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
      setBookings([]);
      setFilteredBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    if (filter === 'ALL') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(b => b.status === filter));
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await apiService.patch(`${API_ENDPOINTS.BOOKING_BY_ID(bookingId)}/status`, {
        status: newStatus,
      });
      fetchBookings();
    } catch (err) {
      alert(`${t('bookings.updateError')}: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="bookings-management">
      <div className="page-header">
        <h1>{t('bookings.title')}</h1>
      </div>

      <div className="status-filters">
        {statuses.map(status => (
          <button
            key={status}
            className={`filter-btn ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'ALL' ? t('bookings.filters.all') : t(`bookings.filters.${status}`)}
            <span className="count">
              {status === 'ALL'
                ? bookings.length
                : bookings.filter(b => b.status === status).length}
            </span>
          </button>
        ))}
      </div>

      <div className="bookings-table">
        <table>
          <thead>
            <tr>
              <th>{t('bookings.table.id')}</th>
              <th>{t('bookings.table.service')}</th>
              <th>{t('bookings.table.client')}</th>
              <th>{t('bookings.table.date')}</th>
              <th>{t('bookings.table.price')}</th>
              <th>{t('bookings.table.status')}</th>
              <th>{t('bookings.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map(booking => (
              <tr key={booking._id}>
                <td>{booking._id.substring(0, 8)}...</td>
                <td>{booking.service?.name ? t(booking.service.name) : 'N/A'}</td>
                <td>{booking.client?.name || 'N/A'}</td>
                <td>{new Date(booking.expectedAt).toLocaleString()}</td>
                <td>{booking.totalPrice} {booking.currency}</td>
                <td>
                  <select
                    value={booking.status}
                    onChange={(e) => handleStatusChange(booking._id, e.target.value)}
                    className={`status-select ${booking.status}`}
                  >
                    <option value="PENDING">{t('bookings.filters.PENDING')}</option>
                    <option value="CONFIRMED">{t('bookings.filters.CONFIRMED')}</option>
                    <option value="IN_PROGRESS">{t('bookings.filters.IN_PROGRESS')}</option>
                    <option value="DONE">{t('bookings.filters.DONE')}</option>
                    <option value="CANCELLED">{t('bookings.filters.CANCELLED')}</option>
                  </select>
                </td>
                <td className="actions">
                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="btn-view"
                    aria-label={t('bookings.viewDetails')}
                    title={t('bookings.viewDetails')}
                  >
                    👁
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBookings.length === 0 && (
          <p className="no-data">{t('bookings.noData')}</p>
        )}
      </div>

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={fetchBookings}
        />
      )}
    </div>
  );
};

export default BookingsManagement;
