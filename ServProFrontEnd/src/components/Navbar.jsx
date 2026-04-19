import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import ProviderListNavLink from './ProviderListNavLink';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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
                <li>
                  <Link to="/notifications" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10" onClick={closeMenu}>{t('nav.notifications', { defaultValue: 'Notifications' })}</Link>
                </li>
              </>
            )}
          </ul>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-3 md:flex-row md:items-center md:gap-3 md:border-none md:pt-0">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <>
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
