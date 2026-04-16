import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { resolveServiceName } from '../utils/serviceName';

const ServiceCard = ({ service }) => {
  const { t } = useTranslation();

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 p-5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-teal-100 opacity-60 blur-xl transition group-hover:opacity-90" />

      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">
          {t(`services.categories.${service.category}`)}
        </span>
      </div>
      
      <div className="flex h-full flex-1 flex-col">
        <h3 className="display-title mb-2 text-xl font-bold text-slate-900">{resolveServiceName(t, service.name)}</h3>
        <p className="mb-4 flex-1 text-sm leading-6 text-slate-600">
          {service.description || t('services.descriptionFallback')}
        </p>
        
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-extrabold text-teal-700">{service.priceMin} {service.currency}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('service.minutes', { count: service.duration })}</span>
          </div>
          
          <Link
            to={`/services/${service._id}`}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {t('services.viewDetails')}
          </Link>
        </div>
      </div>
    </div>
  );
};

ServiceCard.propTypes = {
  service: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    description: PropTypes.string,
    priceMin: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    currency: PropTypes.string.isRequired,
    duration: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }).isRequired,
};

export default ServiceCard;
