import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <p className="display-title text-xl font-extrabold text-slate-900">ServPro</p>
          <p className="mt-3 max-w-sm text-sm text-slate-600">
            {t('footer.description')}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('footer.navigation')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/" className="text-slate-700 transition hover:text-teal-700">{t('nav.home')}</Link></li>
            <li><Link to="/services" className="text-slate-700 transition hover:text-teal-700">{t('nav.services')}</Link></li>
            <li><Link to="/providers" className="text-slate-700 transition hover:text-teal-700">{t('nav.providerList')}</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('footer.contactTitle')}</p>
          <p className="mt-3 text-sm text-slate-600">{t('footer.contactLine')}</p>
          <p className="mt-1 text-sm text-slate-600">support@servpro.tn</p>
        </div>
      </div>

      <div className="border-t border-slate-200/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span>{t('footer.copy', { year })}</span>
          <span>{t('footer.rights')}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;