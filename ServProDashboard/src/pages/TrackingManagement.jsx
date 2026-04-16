import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import '../styles/EntityManagement.css';

const TrackingManagement = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    booking: '',
    position: '',
    at: '',
  });

  useEffect(() => {
    fetchItems();
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await apiService.get(API_ENDPOINTS.BOOKINGS);
      let list = [];
      if (Array.isArray(data.items)) {
        list = data.items;
      } else if (Array.isArray(data)) {
        list = data;
      }
      setBookings(list);
    } catch (err) {
      console.warn('Unable to load bookings lookup:', err);
      setBookings([]);
    }
  };

  const getBookingLabel = (bookingId) => {
    const booking = bookings.find((item) => item._id === bookingId);
    if (!booking) {
      return `${String(bookingId || '').slice(0, 10)}...`;
    }
    const rawServiceName = booking.service?.name || 'Service';
    const serviceName = rawServiceName.startsWith('serviceNames.') ? t(rawServiceName) : rawServiceName;
    const clientName = booking.client?.name || 'Client';
    return `${serviceName} - ${clientName}`;
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.TRACKING);
      let list = [];
      if (Array.isArray(data.items)) {
        list = data.items;
      } else if (Array.isArray(data)) {
        list = data;
      }
      setItems(list);
      setError(null);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ booking: '', position: '', at: '' });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      booking: formData.booking,
      position: formData.position,
      at: formData.at ? new Date(formData.at).toISOString() : undefined,
    };

    try {
      if (editingItem) {
        await apiService.put(API_ENDPOINTS.TRACKING_BY_ID(editingItem._id), payload);
      } else {
        await apiService.post(API_ENDPOINTS.TRACKING, payload);
      }

      resetForm();
      fetchItems();
    } catch (err) {
      alert(t('common.error', { message: err.message }));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    const atValue = item.at ? new Date(item.at).toISOString().slice(0, 16) : '';
    setFormData({
      booking: item.booking || '',
      position: item.position || '',
      at: atValue,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('tracking.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.TRACKING_BY_ID(id));
      fetchItems();
    } catch (err) {
      alert(t('common.error', { message: err.message }));
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="entity-management">
      <div className="page-header">
        <h1>{t('tracking.title')}</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)} aria-label={t('tracking.new')} title={t('tracking.new')}>
          +
        </button>
      </div>

      <div className="entity-layout">
        {showForm && (
          <div className="entity-card">
            <h2>{editingItem ? t('tracking.editTitle') : t('tracking.newTitle')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="booking">{t('tracking.fields.booking')}</label>
                <select id="booking" name="booking" value={formData.booking} onChange={handleChange} required>
                  <option value="">--</option>
                  {bookings.map((booking) => (
                    <option key={booking._id} value={booking._id}>
                      {getBookingLabel(booking._id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="position">{t('tracking.fields.position')}</label>
                  <input id="position" name="position" value={formData.position} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="at">{t('tracking.fields.at')}</label>
                  <input id="at" name="at" type="datetime-local" value={formData.at} onChange={handleChange} />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={resetForm} aria-label={t('buttons.cancel')} title={t('buttons.cancel')}>✕</button>
                <button type="submit" className="btn-primary" aria-label={t('buttons.save')} title={t('buttons.save')}>💾</button>
              </div>
            </form>
          </div>
        )}

        <div className="entity-card entity-table">
          <table>
            <thead>
              <tr>
                <th>{t('tracking.table.booking')}</th>
                <th>{t('tracking.table.position')}</th>
                <th>{t('tracking.table.at')}</th>
                <th>{t('tracking.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{getBookingLabel(item.booking)}</td>
                  <td>{item.position}</td>
                  <td>{item.at ? new Date(item.at).toLocaleString() : '-'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(item)} aria-label={t('buttons.edit')} title={t('buttons.edit')}>✎</button>
                    <button className="btn-delete" onClick={() => handleDelete(item._id)} aria-label={t('buttons.delete')} title={t('buttons.delete')}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="no-data">{t('tracking.noData')}</p>}
        </div>
      </div>
    </div>
  );
};

export default TrackingManagement;