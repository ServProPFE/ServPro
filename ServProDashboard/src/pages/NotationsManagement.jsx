import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import '../styles/EntityManagement.css';

const NotationsManagement = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [providerNames, setProviderNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    average: '',
    total: '',
    provider: '',
  });

  useEffect(() => {
    fetchItems();
    fetchProviderLookups();
  }, []);

  const fetchProviderLookups = async () => {
    try {
      const bookingsData = await apiService.get(API_ENDPOINTS.BOOKINGS);
      let bookingsList = [];
      if (Array.isArray(bookingsData.items)) {
        bookingsList = bookingsData.items;
      } else if (Array.isArray(bookingsData)) {
        bookingsList = bookingsData;
      }

      const namesMap = bookingsList.reduce((acc, booking) => {
        const provider = booking?.provider;
        if (provider?._id && provider?.name) {
          acc[provider._id] = provider.name;
        }
        return acc;
      }, {});
      setProviderNames(namesMap);
    } catch (err) {
      console.warn('Unable to load provider lookup for notations:', err);
      setProviderNames({});
    }
  };

  const getProviderLabel = (providerId) => {
    if (!providerId) {
      return '-';
    }
    return providerNames[providerId] || `${String(providerId).slice(0, 10)}...`;
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.NOTATIONS);
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
    setFormData({ average: '', total: '', provider: '' });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      average: Number(formData.average),
      total: Number(formData.total),
      provider: formData.provider,
    };

    try {
      if (editingItem) {
        await apiService.put(API_ENDPOINTS.NOTATIONS + `/${editingItem._id}`, payload);
      } else {
        await apiService.post(API_ENDPOINTS.NOTATIONS, payload);
      }

      resetForm();
      fetchItems();
    } catch (err) {
      alert(t('common.error', { message: err.message }));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      average: item.average ?? '',
      total: item.total ?? '',
      provider: item.provider || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('notations.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.NOTATIONS + `/${id}`);
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
        <h1>{t('notations.title')}</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)} aria-label={t('notations.new')} title={t('notations.new')}>
          +
        </button>
      </div>

      <div className="entity-layout">
        {showForm && (
          <div className="entity-card">
            <h2>{editingItem ? t('notations.editTitle') : t('notations.newTitle')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="average">{t('notations.fields.average')}</label>
                  <input id="average" name="average" type="number" min="0" max="5" step="0.1" value={formData.average} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="total">{t('notations.fields.total')}</label>
                  <input id="total" name="total" type="number" min="0" value={formData.total} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="provider">{t('notations.fields.provider')}</label>
                <select id="provider" name="provider" value={formData.provider} onChange={handleChange} required>
                  <option value="">--</option>
                  {Object.entries(providerNames).map(([providerId, providerName]) => (
                    <option key={providerId} value={providerId}>
                      {providerName}
                    </option>
                  ))}
                </select>
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
                <th>{t('notations.table.average')}</th>
                <th>{t('notations.table.total')}</th>
                <th>{t('notations.table.provider')}</th>
                <th>{t('notations.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{item.average}</td>
                  <td>{item.total}</td>
                  <td>{getProviderLabel(item.provider)}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(item)} aria-label={t('buttons.edit')} title={t('buttons.edit')}>✎</button>
                    <button className="btn-delete" onClick={() => handleDelete(item._id)} aria-label={t('buttons.delete')} title={t('buttons.delete')}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="no-data">{t('notations.noData')}</p>}
        </div>
      </div>
    </div>
  );
};

export default NotationsManagement;