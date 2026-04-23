import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('ALL');
  const { t } = useTranslation();

  const categories = ['ALL', 'PLOMBERIE', 'ELECTRICITE', 'CLIMATISATION', 'NETTOYAGE', 'AUTRE'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm, category);
  };

  const handleClear = () => {
    setSearchTerm('');
    setCategory('ALL');
    onSearch('', 'ALL');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid w-full gap-3 rounded-2xl border border-white/40 bg-white/80 p-3 shadow-xl backdrop-blur md:grid-cols-[minmax(0,1.6fr)_minmax(180px,240px)_auto] xl:grid-cols-[minmax(0,1.8fr)_minmax(190px,260px)_auto]">
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none ring-teal-500 transition focus:ring-2"
        />
        
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-teal-500 transition focus:ring-2"
        >
          <option value="ALL">{t('search.categoryAll')}</option>
          {categories.slice(1).map(cat => (
            <option key={cat} value={cat}>{t(`services.categories.${cat}`)}</option>
          ))}
        </select>
        
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t('search.button')}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t('search.tipLabel', { defaultValue: 'Search tips' })}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-6 text-slate-700">
            {t('search.scopeHint', {
              defaultValue: 'Search by service name, category, price, or duration.',
            })}
          </p>

          <button
            type="button"
            className="text-sm font-semibold text-teal-700 underline-offset-4 transition hover:text-teal-800 hover:underline"
            onClick={handleClear}
          >
            {t('search.clear', { defaultValue: 'Clear filters' })}
          </button>
        </div>
      </div>
    </form>
  );
};

SearchBar.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

export default SearchBar;
