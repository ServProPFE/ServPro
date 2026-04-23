import { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import NotificationsPanel from './components/NotificationsPanel';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ServicesManagement from './pages/ServicesManagement';
import ServiceForm from './pages/ServiceForm';
import BookingsManagement from './pages/BookingsManagement';
import OffersManagement from './pages/OffersManagement';
import InvoicesManagement from './pages/InvoicesManagement';
import PortfolioManagement from './pages/PortfolioManagement';
import AvailabilityManagement from './pages/AvailabilityManagement';
import ReviewsManagement from './pages/ReviewsManagement';
import CommissionsManagement from './pages/CommissionsManagement';
import TransactionsManagement from './pages/TransactionsManagement';
import CompetencesManagement from './pages/CompetencesManagement';
import CertificationsManagement from './pages/CertificationsManagement';
import TrackingManagement from './pages/TrackingManagement';
import PackagesManagement from './pages/PackagesManagement';
import NotationsManagement from './pages/NotationsManagement';

function App() {
  const { i18n } = useTranslation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const isArabic = i18n.language?.startsWith('ar');
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
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
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="relative min-h-screen lg:flex">
                  <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
                    <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-sky-200/45 blur-3xl" />
                    <div className="absolute right-0 top-14 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
                  </div>
                  <Sidebar />
                  <main className="min-h-screen flex-1 p-4 sm:p-6 lg:p-8">
                    <div className="mb-4 flex justify-start">
                      <div className="relative" ref={notificationsRef}>
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen((prev) => !prev)}
                          aria-label="Notifications"
                          title="Notifications"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-md transition hover:bg-slate-50"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                            <path d="M12 4a5 5 0 0 0-5 5v2.7c0 .7-.24 1.38-.68 1.92L5 15.3V17h14v-1.7l-1.32-1.68a3.1 3.1 0 0 1-.68-1.92V9a5 5 0 0 0-5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </button>
                        <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
                      </div>
                    </div>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/services" element={<ServicesManagement />} />
                      <Route path="/services/new" element={<ServiceForm />} />
                      <Route path="/services/edit/:id" element={<ServiceForm />} />
                      <Route path="/bookings" element={<BookingsManagement />} />
                      <Route path="/offers" element={<OffersManagement />} />
                      <Route path="/portfolio" element={<PortfolioManagement />} />
                      <Route path="/availability" element={<AvailabilityManagement />} />
                      <Route path="/invoices" element={<InvoicesManagement />} />
                      <Route path="/reviews" element={<ReviewsManagement />} />
                      <Route path="/commissions" element={<CommissionsManagement />} />
                      <Route path="/transactions" element={<TransactionsManagement />} />
                      <Route path="/competences" element={<CompetencesManagement />} />
                      <Route path="/certifications" element={<CertificationsManagement />} />
                      <Route path="/tracking" element={<TrackingManagement />} />
                      <Route path="/packages" element={<PackagesManagement />} />
                      <Route path="/notations" element={<NotationsManagement />} />
                      <Route path="/notifications" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
