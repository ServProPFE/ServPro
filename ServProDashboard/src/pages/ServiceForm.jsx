import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import '../styles/ServiceForm.css';

const ServiceForm = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    category: 'PLOMBERIE',
    priceMin: '',
    duration: '',
    currency: 'TND',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = ['PLOMBERIE', 'ELECTRICITE', 'CLIMATISATION', 'NETTOYAGE', 'AUTRE'];

  useEffect(() => {
    if (isEdit) {
      fetchService();
    }
  }, [id]);

  const fetchService = async () => {
    try {
      const data = await apiService.get(API_ENDPOINTS.SERVICE_BY_ID(id));
      setFormData({
        name: data.name,
        category: data.category,
        priceMin: data.priceMin,
        duration: data.duration,
        currency: data.currency || 'TND',
        description: data.description || '',
      });
    } catch (err) {
      console.warn('Unable to load service for editing:', err);
      setError(t('serviceForm.loadError'));
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
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        const payload = {
          ...formData,
          currency: formData.currency || 'TND',
        };
        await apiService.put(API_ENDPOINTS.SERVICE_BY_ID(id), payload);
      } else {
        // Add provider ID for new service
        const serviceData = {
          ...formData,
          currency: formData.currency || 'TND',
          provider: user._id || user.id,
        };
        await apiService.post(API_ENDPOINTS.SERVICES, serviceData);
      }
      navigate('/services');
    } catch (err) {
      setError(err.message || t('serviceForm.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="service-form-page">
      <div className="page-header">
        <h1>{isEdit ? t('serviceForm.editTitle') : t('serviceForm.newTitle')}</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="service-form">
        <div className="form-group">
          <label htmlFor="name">{t('serviceForm.name')} *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder={t('serviceForm.placeholderName')}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">{t('serviceForm.category')} *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{t(`services.categories.${cat}`)}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priceMin">{t('serviceForm.priceMin')} *</label>
            <input
              type="number"
              id="priceMin"
              name="priceMin"
              value={formData.priceMin}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration">{t('serviceForm.duration')} *</label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              required
              min="1"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">{t('serviceForm.description')}</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            placeholder={t('serviceForm.placeholderDescription')}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/services')}
            aria-label={t('serviceForm.cancel')}
            title={t('serviceForm.cancel')}
            className="btn-secondary"
          >
            ✕
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            aria-label={loading ? t('serviceForm.saving') : t('serviceForm.save')}
            title={loading ? t('serviceForm.saving') : t('serviceForm.save')}
          >
            {loading ? '⏳' : '💾'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ServiceForm;
