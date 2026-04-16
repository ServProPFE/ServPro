import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import '../styles/EntityManagement.css';

const CertificationsManagement = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [providerNames, setProviderNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    authority: '',
    expiresAt: '',
    provider: '',
  });

  useEffect(() => {
    fetchItems();
    fetchProviderLookups();
  }, [user]);

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
      console.warn('Unable to load provider lookup for certifications:', err);
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
      const providerId = user?._id || user?.id;
      const url = !isAdmin && providerId
        ? `${API_ENDPOINTS.CERTIFICATIONS}?providerId=${providerId}`
        : API_ENDPOINTS.CERTIFICATIONS;

      const data = await apiService.get(url);
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
    setFormData({ name: '', authority: '', expiresAt: '', provider: '' });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      authority: formData.authority,
      expiresAt: formData.expiresAt || null,
      provider: formData.provider || user?._id || user?.id,
    };

    try {
      if (editingItem) {
        await apiService.put(API_ENDPOINTS.CERTIFICATION_BY_ID(editingItem._id), payload);
      } else {
        await apiService.post(API_ENDPOINTS.CERTIFICATIONS, payload);
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
      name: item.name || '',
      authority: item.authority || '',
      expiresAt: item.expiresAt ? item.expiresAt.substring(0, 10) : '',
      provider: item.provider || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('certifications.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.CERTIFICATION_BY_ID(id));
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
        <h1>{t('certifications.title')}</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)} aria-label={t('certifications.new')} title={t('certifications.new')}>
          +
        </button>
      </div>

      <div className="entity-layout">
        {showForm && (
          <div className="entity-card">
            <h2>{editingItem ? t('certifications.editTitle') : t('certifications.newTitle')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">{t('certifications.fields.name')}</label>
                  <input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="authority">{t('certifications.fields.authority')}</label>
                  <input id="authority" name="authority" value={formData.authority} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiresAt">{t('certifications.fields.expiresAt')}</label>
                  <input id="expiresAt" name="expiresAt" type="date" value={formData.expiresAt} onChange={handleChange} />
                </div>
                {isAdmin && (
                  <div className="form-group">
                    <label htmlFor="provider">{t('certifications.fields.provider')}</label>
                    <select id="provider" name="provider" value={formData.provider} onChange={handleChange}>
                      <option value="">--</option>
                      {Object.entries(providerNames).map(([providerId, providerName]) => (
                        <option key={providerId} value={providerId}>
                          {providerName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                <th>{t('certifications.table.name')}</th>
                <th>{t('certifications.table.authority')}</th>
                <th>{t('certifications.table.expiresAt')}</th>
                <th>{t('certifications.table.provider')}</th>
                <th>{t('certifications.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.authority || '-'}</td>
                  <td>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '-'}</td>
                  <td>{getProviderLabel(item.provider)}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(item)} aria-label={t('buttons.edit')} title={t('buttons.edit')}>✎</button>
                    <button className="btn-delete" onClick={() => handleDelete(item._id)} aria-label={t('buttons.delete')} title={t('buttons.delete')}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="no-data">{t('certifications.noData')}</p>}
        </div>
      </div>
    </div>
  );
};

export default CertificationsManagement;