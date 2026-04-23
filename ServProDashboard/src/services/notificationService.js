import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

const normalizeItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const buildNotificationsUrl = ({ scope, unread } = {}) => {
  const query = new URLSearchParams();

  if (scope) {
    query.set('scope', scope);
  }

  if (typeof unread === 'boolean') {
    query.set('unread', String(unread));
  }

  const queryString = query.toString();
  return queryString ? `${API_ENDPOINTS.NOTIFICATIONS}?${queryString}` : API_ENDPOINTS.NOTIFICATIONS;
};

const notificationService = {
  async listNotifications(options = {}) {
    const data = await apiService.get(buildNotificationsUrl(options));
    return {
      items: normalizeItems(data),
      unreadCount: data?.unreadCount ?? 0,
    };
  },

  async markAsRead(notificationId) {
    return apiService.patch(API_ENDPOINTS.NOTIFICATION_READ(notificationId));
  },

  async markAllAsRead() {
    return apiService.patch(API_ENDPOINTS.NOTIFICATIONS_READ_ALL);
  },
};

export default notificationService;