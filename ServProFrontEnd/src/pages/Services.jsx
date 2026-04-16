import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import ServiceCard from '../components/ServiceCard';
import SearchBar from '../components/SearchBar';
import { filterServicesBySearch } from '../utils/serviceSearch';

const Services = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = ['ALL', 'PLOMBERIE', 'ELECTRICITE', 'CLIMATISATION', 'NETTOYAGE', 'AUTRE'];

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
      setFilteredServices(servicesArray);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err.message);
      setServices([]);
      setFilteredServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm, category) => {
    const filtered = filterServicesBySearch({
      services,
      searchTerm,
      category,
      t,
    });

    setSelectedCategory(category || 'ALL');
    setFilteredServices(filtered);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category === 'ALL') {
      setFilteredServices(services);
    } else {
      setFilteredServices(services.filter(service => service.category === category));
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Catalog</p>
            <h1 className="display-title mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('services.allTitle')}</h1>
            <p className="mt-2 text-sm text-slate-600">{filteredServices.length} {t('services.title').toLowerCase()}</p>
          </div>
          <div className="w-full lg:max-w-4xl xl:max-w-5xl">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === category ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/10' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category === 'ALL' ? t('services.categories.ALL') : t(`services.categories.${category}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredServices.map(service => (
          <ServiceCard key={service._id} service={service} />
        ))}
      </div>

      {filteredServices.length === 0 && (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">{t('services.noResults')}</p>
      )}
    </div>
  );
};

export default Services;
