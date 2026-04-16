import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import '../styles/Offers.css';

const OffersManagement = () => {
  const { t } = useTranslation();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount: '',
    validUntil: '',
    active: true,
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.OFFERS);
      // Backend returns { items: [...] }
      let offersArray = [];
      if (Array.isArray(data.items)) {
        offersArray = data.items;
      } else if (Array.isArray(data)) {
        offersArray = data;
      }
      setOffers(offersArray);
      setError(null);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError(err.message);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOffer) {
        await apiService.put(API_ENDPOINTS.OFFER_BY_ID(editingOffer._id), formData);
      } else {
        await apiService.post(API_ENDPOINTS.OFFERS, formData);
      }
      resetForm();
      fetchOffers();
    } catch (err) {
      alert(t('common.error', { message: err.message }));
    }
  };

  const handleEdit = (offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      discount: offer.discount,
      validUntil: offer.validUntil.substring(0, 10),
      active: offer.active ?? offer.isActive ?? true,
      basePrice: offer.basePrice ?? '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('offers.confirmDelete'))) return;
    try {
      await apiService.delete(API_ENDPOINTS.OFFER_BY_ID(id));
      fetchOffers();
    } catch (err) {
      alert(t('common.error', { message: err.message }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      discount: '',
      validUntil: '',
      active: true,
      basePrice: '',
    });
    setEditingOffer(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="offers-management">
      <div className="page-header">
        <h1>{t('offers.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
          aria-label={t('offers.new')}
          title={t('offers.new')}
        >
          +
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingOffer ? t('offers.editTitle') : t('offers.newTitle')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">{t('offers.fields.title')} *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">{t('offers.fields.description')}</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="discount">{t('offers.fields.discount')} *</label>
                <input
                  type="number"
                  id="discount"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  required
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label htmlFor="basePrice">{t('offers.fields.basePrice')}</label>
                <input
                  type="number"
                    id="basePrice"
                    name="basePrice"
                    value={formData.basePrice || ''}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder={t('offers.fields.basePrice')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="validUntil">{t('offers.fields.validUntil')} *</label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label htmlFor="active">
                <input
                  id="active"
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                {t('offers.fields.active')}
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
                aria-label={t('buttons.cancel')}
                title={t('buttons.cancel')}
              >
                ✕
              </button>
              <button
                type="submit"
                className="btn-primary"
                aria-label={t('buttons.save')}
                title={t('buttons.save')}
              >
                💾
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="offers-table">
        <table>
          <thead>
            <tr>
              <th>{t('offers.table.title')}</th>
              <th>{t('offers.table.description')}</th>
              <th>{t('offers.table.discount')}</th>
              <th>{t('offers.table.basePrice')}</th>
              <th>{t('offers.table.validUntil')}</th>
              <th>{t('offers.table.status')}</th>
              <th>{t('offers.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {offers.map(offer => (
              <tr key={offer._id}>
                <td>{t(offer.title)}</td>
                <td>{offer.description || '-'}</td>
                <td>{offer.discount}%</td>
                <td>{offer.basePrice ?? '-'}</td>
                <td>{new Date(offer.validUntil).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${(offer.active ?? offer.isActive) ? 'active' : 'inactive'}`}>
                    {(offer.active ?? offer.isActive) ? t('offers.status.active') : t('offers.status.inactive')}
                  </span>
                </td>
                <td className="actions">
                  <button
                    onClick={() => handleEdit(offer)}
                    className="btn-edit"
                    aria-label={t('buttons.edit')}
                    title={t('buttons.edit')}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(offer._id)}
                    className="btn-delete"
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
        {offers.length === 0 && <p className="no-data">{t('offers.noData')}</p>}
      </div>
    </div>
  );
};

export default OffersManagement;
