import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import '../styles/Commissions.css';

const CommissionsManagement = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCommission, setTotalCommission] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    percentage: '',
    amount: '',
    booking: '',
  });

  useEffect(() => {
    fetchCommissions();
    if (isAdmin) {
      fetchBookings().then(bookingsArray => setBookings(bookingsArray));
    }
  }, [isAdmin]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.COMMISSIONS);
      let commissionsArray = [];
      if (Array.isArray(data?.items)) {
        commissionsArray = data.items;
      } else if (Array.isArray(data)) {
        commissionsArray = data;
      }
      setCommissions(commissionsArray);
      
      // Calculate total commissions
      const total = commissionsArray.reduce((sum, c) => sum + (c.amount || 0), 0);
      setTotalCommission(total);
    } catch (err) {
      console.error('Error fetching commissions:', err);
      setError(err.message);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const data = await apiService.get(API_ENDPOINTS.BOOKINGS);
      let bookingsArray = [];
      if (Array.isArray(data?.items)) {
        bookingsArray = data.items;
      } else if (Array.isArray(data)) {
        bookingsArray = data;
      }
      return bookingsArray;
    } catch (err) {
      console.error('Error fetching bookings:', err);
      return [];
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateCommission = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!formData.booking) {
      setError(t('commissions.selectBooking'));
      setSaving(false);
      return;
    }

    try {
      const payload = {
        percentage: Number(formData.percentage),
        amount: Number(formData.amount),
        booking: formData.booking,
      };

      await apiService.post(API_ENDPOINTS.COMMISSIONS, payload);
      setFormData({ percentage: '', amount: '', booking: '' });
      setShowCreateModal(false);
      fetchCommissions();
    } catch (err) {
      setError(err.message || t('commissions.createError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  const handleDeleteCommission = async (commissionId) => {
    if (!globalThis.confirm(t('commissions.deleteConfirm'))) {
      return;
    }
    try {      await apiService.delete(API_ENDPOINTS.COMMISSION_BY_ID(commissionId));
      fetchCommissions();
    } catch (err) {
      alert(`${t('commissions.deleteError')}: ${err.message}`);
    }
  };

  return (
    <div className="commissions-management">
      <div className="page-header">
        <h1>{t('commissions.title')}</h1>
        {isAdmin && (
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
            aria-label={t('commissions.new')}
            title={t('commissions.new')}
          >
            +
          </button>
        )}
      </div>

      <div className="commissions-summary">
        <div className="summary-card">
          <h3>{t('commissions.totalCommission')}</h3>
          <p className="amount">{totalCommission.toFixed(2)} TND</p>
        </div>
        <div className="summary-card">
          <h3>{t('commissions.count')}</h3>
          <p className="count">{commissions.length}</p>
        </div>
      </div>

      <div className="commissions-table">
        <table>
          <thead>
            <tr>
              <th>{t('commissions.id')}</th>
              <th>{t('commissions.booking')}</th>
              <th>{t('commissions.provider')}</th>
              <th>{t('commissions.amount')}</th>
              <th>{t('commissions.percentage')}</th>
              <th>{t('commissions.date')}</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map(commission => (
              <tr key={commission._id}>
                <td>{commission._id.substring(0, 8)}...</td>
                <td>{commission.booking?.client?.name || 'N/A'}</td>
                <td>{commission.booking?.provider?.name || 'N/A'}</td>
                <td>{commission.amount || 0} TND</td>
                <td>{commission.percentage || 0}%</td>
                <td>{new Date(commission.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteCommission(commission._id)}
                    aria-label={t('buttons.delete')}
                    title={t('buttons.delete')}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {commissions.length === 0 && (
          <p className="no-data">{t('commissions.noData')}</p>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('commissions.new')}</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form className="modal-body" onSubmit={handleCreateCommission}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="booking">{t('commissions.fields.booking')} *</label>
                <select
                  id="booking"
                  name="booking"
                  value={formData.booking}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('commissions.selectBooking')}</option>
                  {bookings.map(booking => (
                    <option key={booking._id} value={booking._id}>
                      {booking.client?.name || 'Client'} - {booking.service?.name ? t(booking.service.name) : 'Service'} ({booking._id.substring(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="percentage">{t('commissions.fields.percentage')} *</label>
                <input
                  id="percentage"
                  name="percentage"
                  type="number"
                  value={formData.percentage}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder={t('commissions.placeholders.percentage')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="amount">{t('commissions.fields.amount')} *</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder={t('commissions.placeholders.amount')}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} aria-label={t('buttons.cancel')} title={t('buttons.cancel')}>
                  ✕
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  aria-label={saving ? t('buttons.saving') : t('buttons.create')}
                  title={saving ? t('buttons.saving') : t('buttons.create')}
                >
                  {saving ? '⏳' : '💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionsManagement;
