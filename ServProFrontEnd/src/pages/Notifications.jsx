import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import notificationService from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

const Notifications = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.listNotifications();
      setNotifications(data.items);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      return;
    }

    setLoading(false);
  }, [fetchNotifications, isAuthenticated]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const getNotificationTypeLabel = (notificationType) => {
    if (!notificationType) {
      return t('notifications.typeFallback', { defaultValue: 'Notification' });
    }

    return t(`notifications.types.${notificationType}`, {
      defaultValue: notificationType.replaceAll('_', ' '),
    });
  };

  const handleMarkOneAsRead = async (notificationId) => {
    try {
      setBusyId(notificationId);
      await notificationService.markAsRead(notificationId);
      fetchNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setBusyId('all');
      await notificationService.markAllAsRead();
      fetchNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const notificationCards = notifications.map((notification) => {
    const isUnread = !notification.readAt;
    const dateLabel = notification.createdAt ? new Date(notification.createdAt).toLocaleString() : '--';

    return (
      <article
        key={notification._id}
        className={`flex h-full flex-col rounded-2xl border p-4 shadow-lg shadow-slate-900/5 transition ${isUnread ? 'border-teal-300 bg-teal-50/60' : 'border-slate-200 bg-white'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t(`notifications.titles.${notification.type}`, {
                defaultValue: notification.title,
              })}
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {getNotificationTypeLabel(notification.type)}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isUnread ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isUnread ? t('notifications.unread', { defaultValue: 'Unread' }) : t('notifications.read', { defaultValue: 'Read' })}
          </span>
        </div>

        <p className="mt-4 flex-1 text-sm leading-6 text-slate-700">{notification.content}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">{dateLabel}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
            {notification.actor?.name || t('notifications.system', { defaultValue: 'System' })}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
            {notification.metadata?.serviceName || notification.destination}
          </span>
        </div>

        {isUnread ? (
          <button
            type="button"
            onClick={() => handleMarkOneAsRead(notification._id)}
            disabled={busyId === notification._id}
            className="mt-4 inline-flex self-end rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busyId === notification._id
              ? t('common.loading')
              : t('notifications.markRead', { defaultValue: 'Mark read' })}
          </button>
        ) : null}
      </article>
    );
  });

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">ServPro</p>
          <h1 className="display-title mt-2 text-3xl font-extrabold text-slate-900">
            {t('notifications.title', { defaultValue: 'Notifications' })}
          </h1>
          <p className="mt-2 text-slate-600">{t('chatbot.loginRequired')}</p>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700">
            {t('nav.login')}
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">ServPro</p>
            <h1 className="display-title mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {t('notifications.title', { defaultValue: 'Notifications' })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {t('notifications.subtitle', { defaultValue: 'Keep track of booking, payment, and service updates.' })}
              {user?.name ? ` ${t('nav.hello', { name: user.name })}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={busyId === 'all' || unreadCount === 0}
            className="inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busyId === 'all'
              ? t('common.loading')
              : t('notifications.markAllRead', { defaultValue: 'Mark all as read' })}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700">
            {unreadCount} {t('notifications.unread', { defaultValue: 'Unread' })}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            {notifications.length} {t('notifications.total', { defaultValue: 'total' })}
          </span>
        </div>

        <div className="mt-5 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {notificationCards}
          </div>

          {notifications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-medium text-slate-500">
              {t('notifications.empty', { defaultValue: 'No notifications yet.' })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Notifications;