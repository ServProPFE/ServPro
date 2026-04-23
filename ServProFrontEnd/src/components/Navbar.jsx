import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import ProviderListNavLink from './ProviderListNavLink';
import NotificationsPanel from './NotificationsPanel';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  const closeNotifications = () => setNotificationsOpen(false);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleResize = () => {
      if (window.innerWidth >= 768) {
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

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        closeNotifications();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeNotifications();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [notificationsOpen]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-700/20 bg-slate-950/80 backdrop-blur-lg">
      <div className="mx-auto flex h-[78px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="display-title text-2xl font-bold text-white" onClick={closeMenu}>
          <span className="text-teal-300">Serv</span>
          <span className="text-orange-300">Pro</span>
        </Link>

        <button
          type="button"
          className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-controls="frontend-navbar-menu"
        >
          Menu
        </button>

        <div id="frontend-navbar-menu" className={`${menuOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-[78px] flex-col gap-4 border-b border-slate-200/20 bg-slate-950/95 px-4 py-4 md:static md:flex md:flex-row md:items-center md:gap-8 md:border-none md:bg-transparent md:p-0`}>
          <ul className="flex flex-col gap-2 md:flex-row md:items-center md:gap-1">
            <li>
              <Link to="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10" onClick={closeMenu}>{t('nav.home')}</Link>
            </li>
            <li>
              <Link to="/services" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10" onClick={closeMenu}>{t('nav.services')}</Link>
            </li>
            <li>
              <ProviderListNavLink onNavigate={closeMenu} />
            </li>
            {isAuthenticated && (
              <>
                <li>
                  <Link to="/my-bookings" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10" onClick={closeMenu}>{t('nav.myBookings')}</Link>
                </li>
                <li>
                  <Link to="/my-transactions" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10" onClick={closeMenu}>{t('nav.myTransactions')}</Link>
                </li>
              </>
            )}
          </ul>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-3 md:flex-row md:items-center md:gap-3 md:border-none md:pt-0">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((prev) => !prev)}
                    aria-label={t('nav.notifications', { defaultValue: 'Notifications' })}
                    title={t('nav.notifications', { defaultValue: 'Notifications' })}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 4a5 5 0 0 0-5 5v2.7c0 .7-.24 1.38-.68 1.92L5 15.3V17h14v-1.7l-1.32-1.68a3.1 3.1 0 0 1-.68-1.92V9a5 5 0 0 0-5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <NotificationsPanel open={notificationsOpen} onClose={closeNotifications} />
                </div>
                <span className="text-sm font-medium text-slate-100">{t('nav.hello', { name: user?.name })}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" onClick={closeMenu}>
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600" onClick={closeMenu}>
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
