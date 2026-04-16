import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';

const ServicesManagement = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeItems = (payload) => {
    if (Array.isArray(payload?.items)) {
      return payload.items;
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    return [];
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.SERVICES);
      // Backend returns { items: [...] }
      const servicesArray = normalizeItems(data);
      setServices(servicesArray);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err.message);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!globalThis.confirm(t('services.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.SERVICE_BY_ID(id));
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Management</p>
            <h1 className="display-title mt-2 text-3xl font-extrabold text-slate-900">{t('services.title')}</h1>
            <p className="mt-2 text-sm text-slate-600">{services.length} items</p>
          </div>
          <Link
            to="/services/new"
            aria-label={t('services.new')}
            title={t('services.new')}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            +
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-4 font-semibold text-slate-600">{t('services.table.name')}</th>
                <th className="px-5 py-4 font-semibold text-slate-600">{t('services.table.category')}</th>
                <th className="px-5 py-4 font-semibold text-slate-600">{t('services.table.price')}</th>
                <th className="px-5 py-4 font-semibold text-slate-600">{t('services.table.duration')}</th>
                <th className="px-5 py-4 font-semibold text-slate-600">{t('services.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {services.map(service => (
                <tr key={service._id} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-semibold text-slate-900">{t(service.name)}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">{t(`services.categories.${service.category}`)}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{service.priceMin} {service.currency}</td>
                  <td className="px-5 py-4 text-slate-700">{service.duration} min</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/services/edit/${service._id}`}
                        aria-label={t('buttons.edit')}
                        title={t('buttons.edit')}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        ✎
                      </Link>
                      <button
                        onClick={() => handleDelete(service._id)}
                        aria-label={t('buttons.delete')}
                        title={t('buttons.delete')}
                        className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-600"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {services.length === 0 && (
            <p className="p-6 text-center text-sm font-medium text-slate-500">{t('services.noData')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesManagement;
