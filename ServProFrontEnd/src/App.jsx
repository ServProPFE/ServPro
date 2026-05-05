import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Chatbot from './components/Chatbot';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import MyTransactions from './pages/MyTransactions';
import Providers from './pages/Providers';
import ProviderPortfolio from './pages/ProviderPortfolio';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isArabic = i18n.language?.startsWith('ar');
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <Router>
      <AuthProvider>
        <div className="app-shell relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
            <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-teal-300/40 blur-3xl" />
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
          </div>
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/:id" element={<ServiceDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/providers" element={<Providers />} />
              <Route path="/providers/:providerId" element={<ProviderPortfolio />} />
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-transactions"
                element={
                  <ProtectedRoute>
                    <MyTransactions />
                  </ProtectedRoute>
                }
              />
              <Route path="/notifications" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <Chatbot />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
