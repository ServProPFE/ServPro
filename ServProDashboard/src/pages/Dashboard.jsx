import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    totalServices: 0,
    totalRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeItems = (payload) => {
    if (Array.isArray(payload?.items)) {
      return payload.items;
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    return [];
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const bookingsData = await apiService.get(API_ENDPOINTS.BOOKINGS);
      const servicesData = await apiService.get(API_ENDPOINTS.SERVICES);

      // Backend returns { items: [...] }
      const bookingsArray = normalizeItems(bookingsData);
      const servicesArray = normalizeItems(servicesData);

      const totalBookings = bookingsArray.length;
      const pendingBookings = bookingsArray.filter(b => b.status === 'PENDING').length;
      const totalRevenue = bookingsArray
        .filter(b => b.status === 'DONE')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      setStats({
        totalBookings,
        pendingBookings,
        totalServices: servicesArray.length,
        totalRevenue,
      });

      // Get recent bookings
      const recent = bookingsArray
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentBookings(recent);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Operations Center</p>
        <h1 className="display-title mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">{t('dashboard.title')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('dashboard.welcome', { name: user?.name })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t('dashboard.stats.totalBookings')}
          value={stats.totalBookings}
          icon="📊"
          color="blue"
        />
        <StatsCard
          title={t('dashboard.stats.pending')}
          value={stats.pendingBookings}
          icon="⏳"
          color="yellow"
        />
        <StatsCard
          title={t('dashboard.stats.services')}
          value={stats.totalServices}
          icon="🛠️"
          color="purple"
        />
        <StatsCard
          title={t('dashboard.stats.revenue')}
          value={`${stats.totalRevenue} TND`}
          icon="💰"
          color="green"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="display-title text-xl font-bold text-slate-900">{t('dashboard.recentTitle')}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 font-semibold text-slate-600">{t('dashboard.table.service')}</th>
                <th className="px-5 py-3 font-semibold text-slate-600">{t('dashboard.table.client')}</th>
                <th className="px-5 py-3 font-semibold text-slate-600">{t('dashboard.table.date')}</th>
                <th className="px-5 py-3 font-semibold text-slate-600">{t('dashboard.table.status')}</th>
                <th className="px-5 py-3 font-semibold text-slate-600">{t('dashboard.table.price')}</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking) => {
                const statusColor = {
                  PENDING: 'bg-amber-100 text-amber-700',
                  CONFIRMED: 'bg-sky-100 text-sky-700',
                  DONE: 'bg-emerald-100 text-emerald-700',
                  CANCELED: 'bg-rose-100 text-rose-700',
                };

                return (
                  <tr key={booking._id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-semibold text-slate-900">{booking.service?.name ? t(booking.service.name) : 'N/A'}</td>
                    <td className="px-5 py-3 text-slate-700">{booking.client?.name || 'N/A'}</td>
                    <td className="px-5 py-3 text-slate-700">{new Date(booking.expectedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor[booking.status] || 'bg-slate-100 text-slate-700'}`}>
                        {t(`bookings.filters.${booking.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{booking.totalPrice} {booking.currency}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {recentBookings.length === 0 && (
            <p className="p-6 text-center text-sm font-medium text-slate-500">{t('dashboard.noRecent')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
