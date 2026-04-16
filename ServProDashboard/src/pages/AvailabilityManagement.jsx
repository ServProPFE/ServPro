import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import '../styles/Availability.css';

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AvailabilityManagement = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    day: 1,
    start: '08:00',
    end: '17:00',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, [user]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const providerId = user?._id || user?.id;
      const url = providerId && !isAdmin
        ? `${API_ENDPOINTS.AVAILABILITY}?providerId=${providerId}`
        : API_ENDPOINTS.AVAILABILITY;
      const data = await apiService.get(url);
      let itemsArray = [];
      if (Array.isArray(data?.items)) {
        itemsArray = data.items;
      } else if (Array.isArray(data)) {
        itemsArray = data;
      }
      setItems(itemsArray);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const providerId = user?._id || user?.id;
      await apiService.post(API_ENDPOINTS.AVAILABILITY, {
        day: Number(formData.day),
        start: formData.start,
        end: formData.end,
        provider: providerId,
      });

      setFormData({ day: 1, start: '08:00', end: '17:00' });
      fetchAvailability();
    } catch (err) {
      console.error('Error creating availability:', err);
      setError(err.message || t('availability.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('availability.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.AVAILABILITY_BY_ID(id));
      fetchAvailability();
    } catch (err) {
      console.error('Error deleting availability:', err);
      alert(t('common.error', { message: err.message }));
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="availability-page">
      <div className="page-header">
        <h1>{t('availability.title')}</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="availability-layout">
        <form className="availability-form" onSubmit={handleSubmit}>
          <h2>{t('availability.addTitle')}</h2>
          <div className="form-group">
            <label htmlFor="day">{t('availability.fields.day')}</label>
            <select id="day" name="day" value={formData.day} onChange={handleChange}>
              {dayLabels.map((label, index) => (
                <option key={label} value={index}>
                  {t(`availability.days.${index}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start">{t('availability.fields.start')}</label>
              <input
                id="start"
                name="start"
                type="time"
                value={formData.start}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end">{t('availability.fields.end')}</label>
              <input
                id="end"
                name="end"
                type="time"
                value={formData.end}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            aria-label={saving ? t('buttons.saving') : t('availability.add')}
            title={saving ? t('buttons.saving') : t('availability.add')}
          >
            {saving ? '⏳' : '+'}
          </button>
        </form>

        <div className="availability-list">
          <h2>{t('availability.mySlots')}</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{t('availability.table.day')}</th>
                  <th>{t('availability.table.start')}</th>
                  <th>{t('availability.table.end')}</th>
                  <th>{t('availability.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((slot) => (
                  <tr key={slot._id}>
                    <td>{t(`availability.days.${slot.day}`) || slot.day}</td>
                    <td>{slot.start}</td>
                    <td>{slot.end}</td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(slot._id)}
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
            {items.length === 0 && (
              <p className="no-data">{t('availability.noData')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManagement;
