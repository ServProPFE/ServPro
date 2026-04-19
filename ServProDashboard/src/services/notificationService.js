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

const notificationService = {
  async listNotifications() {
    const data = await apiService.get(API_ENDPOINTS.NOTIFICATIONS);
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