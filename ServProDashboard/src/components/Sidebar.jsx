import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

const Sidebar = () => {
  const { user, logout, isProvider, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const canManageProviderResources = isProvider || isAdmin;

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    setTimeout(() => setMenuOpen(false), 0);
  }, [location.pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const providerLinks = [
    { to: '/portfolio', icon: '📸', label: 'nav.portfolio' },
    { to: '/availability', icon: '📆', label: 'nav.availability' },
    { to: '/competences', icon: '🧠', label: 'nav.competences' },
    { to: '/certifications', icon: '🎓', label: 'nav.certifications' },
    { to: '/tracking', icon: '📍', label: 'nav.tracking' },
  ];

  const adminLinks = [
    { to: '/commissions', icon: '💰', label: 'nav.commissions' },
    { to: '/reviews', icon: '⭐', label: 'nav.reviews' },
    { to: '/transactions', icon: '💳', label: 'nav.transactions' },
    { to: '/packages', icon: '📦', label: 'nav.packages' },
    { to: '/notations', icon: '🧮', label: 'nav.notations' },
  ];

  const baseLink = 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition';
  const activeLink = 'bg-sky-500/20 text-white';
  const idleLink = 'text-slate-300 hover:bg-white/10 hover:text-white';

  const renderNavLink = (to, icon, label, exact = false) => {
    const active = exact ? location.pathname === to : isActive(to);
    return (
      <Link key={to} to={to} className={`${baseLink} ${active ? activeLink : idleLink}`} onClick={() => setMenuOpen(false)}>
        <span>{icon}</span>
        <span>{t(label)}</span>
      </Link>
    );
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/70 bg-white/70 p-3 backdrop-blur lg:hidden">
        <h2 className="display-title text-xl font-bold text-slate-900">
          <span className="text-sky-600">Serv</span>
          <span className="text-emerald-600">Pro</span>
        </h2>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-controls="dashboard-sidebar"
        >
          Menu
        </button>
      </div>

      <aside id="dashboard-sidebar" className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-72 max-w-[88vw] flex-col border-r border-slate-700/40 bg-slate-950 p-4 shadow-2xl shadow-slate-900/40 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}>
        <div className="mb-4 flex items-center justify-between lg:justify-start">
          <h2 className="display-title text-2xl font-bold text-white">
            <span className="text-sky-300">Serv</span>
            <span className="text-emerald-300">Pro</span>
          </h2>
          <button
            type="button"
            className="rounded-md border border-white/20 px-2 py-1 text-xs font-semibold text-white lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            Close
          </button>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{user?.type ? t(`roles.${user.type}`) : ''}</p>
        <div className="mb-5">
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Main</p>
            {renderNavLink('/', '📊', 'nav.dashboard', true)}
            {renderNavLink('/services', '🛠️', 'nav.services')}
            {renderNavLink('/bookings', '📅', 'nav.bookings')}
            {renderNavLink('/offers', '🎁', 'nav.offers')}
            {renderNavLink('/invoices', '🧾', 'nav.invoices')}
          </div>

          {canManageProviderResources && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Provider</p>
              {providerLinks.map((item) => renderNavLink(item.to, item.icon, item.label))}
            </div>
          )}

          {isAdmin && (
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Admin</p>
              {adminLinks.map((item) => renderNavLink(item.to, item.icon, item.label))}
            </div>
          )}
        </nav>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-300">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
    </>
  );
};

export default Sidebar;
