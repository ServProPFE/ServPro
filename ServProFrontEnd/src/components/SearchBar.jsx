import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('ALL');
  const { t } = useTranslation();

  const categories = ['ALL', 'PLOMBERIE', 'ELECTRICITE', 'CLIMATISATION', 'NETTOYAGE', 'AUTRE'];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm, category);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid w-full gap-3 rounded-2xl border border-white/40 bg-white/80 p-3 shadow-xl backdrop-blur sm:grid-cols-[1fr_220px_auto]">
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none ring-teal-500 transition focus:ring-2"
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
    </form>
  );
};

export default SearchBar;
