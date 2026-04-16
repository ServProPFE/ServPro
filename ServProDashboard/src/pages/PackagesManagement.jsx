import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import '../styles/EntityManagement.css';

const PackagesManagement = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    months: '',
    numberVisits: '',
    monthlyPrice: '',
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.PACKAGES);
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
    setFormData({ name: '', months: '', numberVisits: '', monthlyPrice: '' });
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
      months: Number(formData.months),
      numberVisits: Number(formData.numberVisits),
      monthlyPrice: Number(formData.monthlyPrice),
    };

    try {
      if (editingItem) {
        await apiService.put(API_ENDPOINTS.PACKAGE_BY_ID(editingItem._id), payload);
      } else {
        await apiService.post(API_ENDPOINTS.PACKAGES, payload);
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
      months: item.months ?? '',
      numberVisits: item.numberVisits ?? '',
      monthlyPrice: item.monthlyPrice ?? '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('packages.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.PACKAGE_BY_ID(id));
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
        <h1>{t('packages.title')}</h1>
        <button
          className="btn-primary"
          onClick={() => setShowForm(true)}
          aria-label={t('packages.new')}
          title={t('packages.new')}
        >
          +
        </button>
      </div>

      <div className="entity-layout">
        {showForm && (
          <div className="entity-card">
            <h2>{editingItem ? t('packages.editTitle') : t('packages.newTitle')}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">{t('packages.fields.name')}</label>
                <input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="months">{t('packages.fields.months')}</label>
                  <input id="months" name="months" type="number" min="1" value={formData.months} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="numberVisits">{t('packages.fields.numberVisits')}</label>
                  <input id="numberVisits" name="numberVisits" type="number" min="1" value={formData.numberVisits} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="monthlyPrice">{t('packages.fields.monthlyPrice')}</label>
                <input id="monthlyPrice" name="monthlyPrice" type="number" min="0" step="0.01" value={formData.monthlyPrice} onChange={handleChange} required />
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
                <th>{t('packages.table.name')}</th>
                <th>{t('packages.table.months')}</th>
                <th>{t('packages.table.numberVisits')}</th>
                <th>{t('packages.table.monthlyPrice')}</th>
                <th>{t('packages.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>{item.months}</td>
                  <td>{item.numberVisits}</td>
                  <td>{item.monthlyPrice}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(item)} aria-label={t('buttons.edit')} title={t('buttons.edit')}>✎</button>
                    <button className="btn-delete" onClick={() => handleDelete(item._id)} aria-label={t('buttons.delete')} title={t('buttons.delete')}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="no-data">{t('packages.noData')}</p>}
        </div>
      </div>
    </div>
  );
};

export default PackagesManagement;