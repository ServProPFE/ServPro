import { useState, useEffect, useMemo } from 'react';
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
  const [services, setServices] = useState([]);
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
      setServices(servicesArray);

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

  const dashboardInsights = useMemo(() => {
    const categoryCounts = services.reduce((accumulator, service) => {
      const category = service.category || 'AUTRE';
      accumulator[category] = (accumulator[category] || 0) + 1;
      return accumulator;
    }, {});

    const [topCategory, topCategoryCount] = Object.entries(categoryCounts)
      .sort((left, right) => right[1] - left[1])[0] || ['AUTRE', 0];

    const completedBookings = recentBookings.filter((booking) => booking.status === 'DONE').length;
    const completionRate = recentBookings.length
      ? Math.round((completedBookings / recentBookings.length) * 100)
      : 0;

    const averageRevenue = completedBookings > 0
      ? Math.round(stats.totalRevenue / completedBookings)
      : 0;

    let recommendation = t('dashboard.recommendationCatalog', { defaultValue: 'Grow the catalog to expand reach.' });

    if (stats.pendingBookings > Math.max(1, Math.round(stats.totalBookings * 0.3))) {
      recommendation = t('dashboard.recommendationPending', { defaultValue: 'Prioritize booking confirmations and follow-ups.' });
    } else if (topCategoryCount > 0) {
      recommendation = t('dashboard.recommendationCategory', { defaultValue: 'Promote the highest-demand service category.' });
    }

    return {
      topCategory,
      topCategoryCount,
      completionRate,
      averageRevenue,
      recommendation,
    };
  }, [recentBookings, services, stats.pendingBookings, stats.totalBookings, stats.totalRevenue, t]);

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

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-lg shadow-sky-100/50">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">{t('dashboard.insightsTitle', { defaultValue: 'AI insights' })}</p>
          <h2 className="display-title mt-2 text-2xl font-bold text-slate-900">{t('dashboard.insightsSubtitle', { defaultValue: 'Operational recommendations from live data' })}</h2>
          <p className="mt-2 text-sm text-slate-600">{t('dashboard.insightsDescription', { defaultValue: 'Use these signals to prioritize confirmations, service growth, and revenue planning.' })}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('dashboard.topCategory', { defaultValue: 'Top category' })}</p>
              <p className="display-title mt-2 text-2xl font-extrabold text-slate-900">{t(`services.categories.${dashboardInsights.topCategory}`)}</p>
              <p className="mt-1 text-sm text-slate-600">{dashboardInsights.topCategoryCount} {t('dashboard.stats.services').toLowerCase()}</p>
            </article>
            <article className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('dashboard.completionRate', { defaultValue: 'Completion rate' })}</p>
              <p className="display-title mt-2 text-2xl font-extrabold text-slate-900">{dashboardInsights.completionRate}%</p>
              <p className="mt-1 text-sm text-slate-600">{t('dashboard.averageRevenue', { defaultValue: 'Avg. revenue per completed booking' })}: {dashboardInsights.averageRevenue} TND</p>
            </article>
          </div>
        </div>

        <aside className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-lg shadow-emerald-100/50">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">{t('dashboard.recommendationTitle', { defaultValue: 'Recommended action' })}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{t('dashboard.recommendationHeading', { defaultValue: 'What to do next' })}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">{dashboardInsights.recommendation}</p>

          <div className="mt-5 rounded-2xl border border-white bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('dashboard.kpiTitle', { defaultValue: 'Live KPI' })}</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">{t('dashboard.stats.pending')}</p>
                <p className="display-title text-3xl font-extrabold text-slate-900">{stats.pendingBookings}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-500">{t('dashboard.stats.revenue')}</p>
                <p className="display-title text-3xl font-extrabold text-slate-900">{stats.totalRevenue} TND</p>
              </div>
            </div>
          </div>
        </aside>
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
