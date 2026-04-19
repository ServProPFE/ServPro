import { API_ENDPOINTS } from '@/services/apiConfig';
import { apiService } from '@/services/apiService';

export type NotificationItem = {
  _id: string;
  title: string;
  type: string;
  content: string;
  destination: string;
  readAt?: string | null;
  createdAt?: string;
  metadata?: {
    bookingId?: string;
    transactionId?: string;
    serviceName?: string;
    status?: string;
  };
  actor?: {
    name?: string;
    type?: string;
  };
};

type ApiItems<T> = { items?: T[]; unreadCount?: number } | T[];

const normalizeItems = <T,>(payload: ApiItems<T>): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
};

export const notificationService = {
  async getNotifications() {
    const data = await apiService.get<ApiItems<NotificationItem>>(API_ENDPOINTS.NOTIFICATIONS);
    return {
      items: normalizeItems(data),
      unreadCount: Array.isArray(data) ? 0 : data.unreadCount ?? 0,
    };
  },

  async markAsRead(notificationId: string) {
    return apiService.patch<NotificationItem>(API_ENDPOINTS.NOTIFICATION_READ(notificationId));
  },

  async markAllAsRead() {
    return apiService.patch<{ message: string; modifiedCount: number }>(API_ENDPOINTS.NOTIFICATIONS_READ_ALL);
  },
};