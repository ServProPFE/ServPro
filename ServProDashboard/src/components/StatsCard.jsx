import PropTypes from 'prop-types';

const StatsCard = ({ title, value, icon, color }) => {
  const colorMap = {
    blue: 'from-sky-500 to-blue-500',
    yellow: 'from-amber-500 to-orange-500',
    purple: 'from-violet-500 to-fuchsia-500',
    green: 'from-emerald-500 to-teal-500',
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-200 hover:shadow-2xl hover:shadow-sky-900/10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-sky-50/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-500 transition-colors duration-300 group-hover:text-slate-700">{title}</h3>
          <p className="display-title mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.blue} text-lg text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.string.isRequired,
  color: PropTypes.string,
};

export default StatsCard;
