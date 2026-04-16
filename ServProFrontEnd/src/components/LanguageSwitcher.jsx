import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const handleChange = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="inline-flex rounded-full border border-white/25 bg-slate-900/55 p-1 backdrop-blur">
      <button
        type="button"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
          current === 'en' ? 'bg-teal-500 text-white shadow-md shadow-teal-900/25' : 'text-slate-200 hover:bg-white/10'
        }`}
        onClick={() => handleChange('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
          current === 'ar' ? 'bg-teal-500 text-white shadow-md shadow-teal-900/25' : 'text-slate-200 hover:bg-white/10'
        }`}
        onClick={() => handleChange('ar')}
      >
        AR
      </button>
    </div>
  );
};

export default LanguageSwitcher;
