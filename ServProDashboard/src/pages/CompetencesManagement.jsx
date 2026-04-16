import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import '../styles/EntityManagement.css';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];

const CompetencesManagement = () => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [providerNames, setProviderNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    serviceId: '',
    level: 'BEGINNER',
    provider: '',
  });

  useEffect(() => {
    fetchItems();
    fetchLookups();
  }, [user]);

  const fetchLookups = async () => {
    try {
      const [servicesData, bookingsData] = await Promise.all([
        apiService.get(API_ENDPOINTS.SERVICES),
        apiService.get(API_ENDPOINTS.BOOKINGS),
      ]);

      let servicesList = [];
      if (Array.isArray(servicesData.items)) {
        servicesList = servicesData.items;
      } else if (Array.isArray(servicesData)) {
        servicesList = servicesData;
      }
      setServices(servicesList);

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
      // Keep the page operational even if lookup endpoints are unavailable.
      console.warn('Unable to load competence lookup data:', err);
      setServices([]);
      setProviderNames({});
    }
  };

  const getServiceLabel = (serviceId) => {
    const found = services.find((service) => service._id === serviceId);
    if (!found?.name) {
      return serviceId;
    }
    return found.name.startsWith('serviceNames.') ? t(found.name) : found.name;
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
        ? `${API_ENDPOINTS.COMPETENCES}?providerId=${providerId}`
        : API_ENDPOINTS.COMPETENCES;

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
    setFormData({
      serviceId: '',
      level: 'BEGINNER',
      provider: '',
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const providerId = formData.provider || user?._id || user?.id;
    const payload = {
      serviceId: formData.serviceId,
      level: formData.level,
      provider: providerId,
    };

    try {
      if (editingItem) {
        await apiService.put(API_ENDPOINTS.COMPETENCE_BY_ID(editingItem._id), payload);
      } else {
        await apiService.post(API_ENDPOINTS.COMPETENCES, payload);
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
      serviceId: item.serviceId || '',
      level: item.level || 'BEGINNER',
      provider: item.provider || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('competences.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.COMPETENCE_BY_ID(id));
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
        <h1>{t('competences.title')}</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)} aria-label={t('competences.new')} title={t('competences.new')}>
          +
        </button>
      </div>

      <div className="entity-layout">
        {showForm && (
          <div className="entity-card">
            <h2>{editingItem ? t('competences.editTitle') : t('competences.newTitle')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="serviceId">{t('competences.fields.serviceId')}</label>
                  <select id="serviceId" name="serviceId" value={formData.serviceId} onChange={handleChange} required>
                    <option value="">--</option>
                    {services.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.name?.startsWith('serviceNames.') ? t(service.name) : service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="level">{t('competences.fields.level')}</label>
                  <select id="level" name="level" value={formData.level} onChange={handleChange}>
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>{t(`competences.levels.${level}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label htmlFor="provider">{t('competences.fields.provider')}</label>
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
                <th>{t('competences.table.serviceId')}</th>
                <th>{t('competences.table.level')}</th>
                <th>{t('competences.table.provider')}</th>
                <th>{t('competences.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{getServiceLabel(item.serviceId)}</td>
                  <td>{t(`competences.levels.${item.level}`)}</td>
                  <td>{getProviderLabel(item.provider)}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(item)} aria-label={t('buttons.edit')} title={t('buttons.edit')}>✎</button>
                    <button className="btn-delete" onClick={() => handleDelete(item._id)} aria-label={t('buttons.delete')} title={t('buttons.delete')}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="no-data">{t('competences.noData')}</p>}
        </div>
      </div>
    </div>
  );
};

export default CompetencesManagement;