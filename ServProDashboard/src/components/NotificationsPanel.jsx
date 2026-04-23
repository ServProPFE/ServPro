import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import notificationService from '../services/notificationService';

const NotificationsPanel = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await notificationService.listNotifications();
      setNotifications(data.items || []);
    } catch (err) {
      setNotifications([]);
      setError(err.message || t('notifications.loadError', { defaultValue: 'Unable to load notifications.' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [fetchNotifications, open]);

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

  if (!open) {
    return null;
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,28rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">{t('notifications.title', { defaultValue: 'Notifications' })}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          {t('common.close', { defaultValue: 'Close' })}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-slate-600">
        <span className="rounded-full bg-sky-50 px-2 py-1 font-semibold text-sky-700">
          {unreadCount} {t('notifications.unread', { defaultValue: 'Unread' })}
        </span>
        <button
          type="button"
          onClick={handleMarkAllAsRead}
          disabled={busyId === 'all' || unreadCount === 0}
          className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busyId === 'all'
            ? t('common.loading')
            : t('notifications.markAllRead', { defaultValue: 'Mark all as read' })}
        </button>
      </div>

      <div className="max-h-[65vh] space-y-3 overflow-y-auto border-t border-slate-100 p-4">
        {loading && <p className="text-sm text-slate-600">{t('common.loading')}</p>}
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

        {!loading && !error && notifications.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
            {t('notifications.empty', { defaultValue: 'No notifications yet.' })}
          </p>
        )}

        {!loading && !error && notifications.map((notification) => {
          const isUnread = !notification.readAt;
          const dateLabel = notification.createdAt ? new Date(notification.createdAt).toLocaleString() : '--';

          return (
            <article
              key={notification._id}
              className={`rounded-xl border p-3 text-sm ${isUnread ? 'border-sky-300 bg-sky-50/60' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {t(`notifications.titles.${notification.type}`, {
                      defaultValue: notification.title,
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.15em] text-slate-500">
                    {getNotificationTypeLabel(notification.type)}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isUnread ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {isUnread ? t('notifications.unread', { defaultValue: 'Unread' }) : t('notifications.read', { defaultValue: 'Read' })}
                </span>
              </div>

              <p className="mt-2 leading-5 text-slate-700">{notification.content}</p>

              <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5">{dateLabel}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5">
                  {notification.actor?.name || t('notifications.system', { defaultValue: 'System' })}
                </span>
              </div>

              {isUnread ? (
                <button
                  type="button"
                  onClick={() => handleMarkOneAsRead(notification._id)}
                  disabled={busyId === notification._id}
                  className="mt-2 rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {busyId === notification._id
                    ? t('common.loading')
                    : t('notifications.markRead', { defaultValue: 'Mark read' })}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsPanel;
