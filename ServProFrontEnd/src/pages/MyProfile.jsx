import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';

const MyProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const userId = user?._id || user?.id;
        if (!userId) {
          setBookings([]);
          setTransactions([]);
          return;
        }

        const bookingEndpoint = user?.type === 'PROVIDER'
          ? API_ENDPOINTS.MY_PROVIDER_BOOKINGS(userId)
          : API_ENDPOINTS.MY_BOOKINGS(userId);

        const [bookingsResponse, transactionsResponse] = await Promise.all([
          apiService.get(bookingEndpoint),
          apiService.get(API_ENDPOINTS.TRANSACTIONS),
        ]);

        const bookingsArray = Array.isArray(bookingsResponse?.items)
          ? bookingsResponse.items
          : Array.isArray(bookingsResponse)
            ? bookingsResponse
            : [];

        const transactionsArray = Array.isArray(transactionsResponse?.items)
          ? transactionsResponse.items
          : Array.isArray(transactionsResponse)
            ? transactionsResponse
            : [];

        setBookings(bookingsArray);
        setTransactions(transactionsArray);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const providerProfile = user?.providerProfile || {};

  const stats = useMemo(() => {
    const pendingBookings = bookings.filter((booking) => booking.status === 'PENDING').length;
    const completedBookings = bookings.filter((booking) => booking.status === 'DONE').length;
    const successfulTransactions = transactions.filter((transaction) => transaction.status === 'SUCCESS').length;
    const completionRate = bookings.length ? Math.round((completedBookings / bookings.length) * 100) : 0;
    const profileCompleteness = [user?.name, user?.email, user?.phone, user?.type, providerProfile.companyName, providerProfile.location].filter(Boolean).length;

    return {
      bookings: bookings.length,
      pendingBookings,
      completedBookings,
      transactions: transactions.length,
      successfulTransactions,
      completionRate,
      profileCompleteness: Math.round((profileCompleteness / 6) * 100),
    };
  }, [bookings, providerProfile.companyName, providerProfile.location, transactions, user]);

  const recentBookings = useMemo(
    () => [...bookings].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 3),
    [bookings],
  );

  const recentTransactions = useMemo(
    () => [...transactions].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 3),
    [transactions],
  );

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <section className="group relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white to-teal-50/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-3xl font-bold text-white ring-1 ring-white/20">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-200">{t('profile.pageLabel', { defaultValue: 'Account Center' })}</p>
                <h1 className="display-title mt-2 text-3xl font-extrabold sm:text-4xl">{t('profile.title', { defaultValue: 'My Profile' })}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">{t('profile.subtitle', { defaultValue: 'Everything about the user account in a single profile.' })}</p>
                <p className="mt-3 text-sm text-slate-200">{user?.email || user?.phone || t('profile.notAvailable', { defaultValue: 'Not available' })}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <ProfileMeta label={t('profile.role', { defaultValue: 'Account type' })} value={user?.type || t('profile.notAvailable', { defaultValue: 'Not available' })} />
              <ProfileMeta label={t('profile.joined', { defaultValue: 'Joined' })} value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('profile.notAvailable', { defaultValue: 'Not available' })} />
            </div>
          </div>
        </div>

        <div className="relative grid gap-8 px-6 py-8 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title={t('profile.stats.bookings', { defaultValue: 'Bookings' })} value={stats.bookings} note={`${stats.pendingBookings} ${t('profile.pendingBookings', { defaultValue: 'pending' })}`} accent="from-sky-500 to-cyan-500" />
            <MetricCard title={t('profile.stats.transactions', { defaultValue: 'Transactions' })} value={stats.transactions} note={`${stats.successfulTransactions} ${t('profile.successfulTransactions', { defaultValue: 'successful' })}`} accent="from-emerald-500 to-teal-500" />
            <MetricCard title={t('profile.stats.completionRate', { defaultValue: 'Completion rate' })} value={`${stats.completionRate}%`} note={`${stats.completedBookings} ${t('profile.completedBookings', { defaultValue: 'completed bookings' })}`} accent="from-amber-500 to-orange-500" />
            <MetricCard title={t('profile.stats.completeness', { defaultValue: 'Profile completeness' })} value={`${stats.profileCompleteness}%`} note={t('profile.stats.completenessHint', { defaultValue: 'Based on the account fields you completed' })} accent="from-violet-500 to-fuchsia-500" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <ProfilePanel title={t('profile.accountDetails', { defaultValue: 'Account details' })} accent="sky">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ProfileField label={t('profile.fullName', { defaultValue: 'Full name' })} value={user?.name} />
                  <ProfileField label={t('profile.email', { defaultValue: 'Email' })} value={user?.email} />
                  <ProfileField label={t('profile.phone', { defaultValue: 'Phone' })} value={user?.phone} />
                  <ProfileField label={t('profile.accountType', { defaultValue: 'Account type' })} value={user?.type} />
                </div>
              </ProfilePanel>

              {user?.providerProfile && (
                <ProfilePanel title={t('profile.providerDetails', { defaultValue: 'Provider profile' })} accent="emerald">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField label={t('profile.companyName', { defaultValue: 'Company name' })} value={providerProfile.companyName} />
                    <ProfileField label={t('profile.location', { defaultValue: 'Location' })} value={providerProfile.location} />
                    <ProfileField label={t('profile.experience', { defaultValue: 'Experience' })} value={providerProfile.experienceYears != null ? t('service.years', { count: providerProfile.experienceYears }) : null} />
                    <ProfileField label={t('profile.verificationStatus', { defaultValue: 'Verification status' })} value={providerProfile.verificationStatus} />
                  </div>
                </ProfilePanel>
              )}

              <ProfilePanel title={t('profile.activity', { defaultValue: 'Recent activity' })} accent="teal">
                <div className="space-y-4">
                  {recentBookings.length > 0 ? recentBookings.map((booking) => (
                    <div key={booking._id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{booking.service?.name || t('profile.bookingFallback', { defaultValue: 'Booking' })}</p>
                          <p className="text-sm text-slate-500">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '-'}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{booking.status}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">{t('profile.noBookings', { defaultValue: 'No bookings yet.' })}</div>
                  )}
                </div>
              </ProfilePanel>
            </div>

            <div className="space-y-6">
              <ProfilePanel title={t('profile.transactions', { defaultValue: 'Recent transactions' })} accent="amber">
                <div className="space-y-4">
                  {recentTransactions.length > 0 ? recentTransactions.map((transaction) => (
                    <div key={transaction._id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{transaction.amount} {transaction.currency}</p>
                          <p className="text-sm text-slate-500">{transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : '-'}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{transaction.status}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">{t('profile.noTransactions', { defaultValue: 'No transactions yet.' })}</div>
                  )}
                </div>
              </ProfilePanel>

              <ProfilePanel title={t('profile.shortcuts', { defaultValue: 'Shortcuts' })} accent="sky">
                <div className="grid gap-3 sm:grid-cols-2">
                  <QuickLink to="/my-bookings" label={t('profile.goToBookings', { defaultValue: 'View bookings' })} />
                  <QuickLink to="/my-transactions" label={t('profile.goToTransactions', { defaultValue: 'View transactions' })} />
                  <QuickLink to="/services" label={t('profile.goToServices', { defaultValue: 'Browse services' })} />
                  <QuickLink to="/providers" label={t('profile.goToProviders', { defaultValue: 'Browse providers' })} />
                </div>
              </ProfilePanel>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const MetricCard = ({ title, value, note, accent }) => (
  <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
    <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{note}</p>
  </div>
);

const ProfilePanel = ({ title, accent, children }) => (
  <div className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-white via-white ${accent === 'sky' ? 'to-sky-50/70' : accent === 'teal' ? 'to-teal-50/70' : accent === 'emerald' ? 'to-emerald-50/70' : 'to-amber-50/70'} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
    <div className="relative">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  </div>
);

const ProfileField = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</p>
  </div>
);

const ProfileMeta = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900">{value || '—'}</p>
  </div>
);

const QuickLink = ({ to, label }) => (
  <Link to={to} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
    {label}
  </Link>
);

export default MyProfile;