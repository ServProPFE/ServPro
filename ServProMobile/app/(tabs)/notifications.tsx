import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { notificationService, type NotificationItem } from '@/services/notificationService';

const timeLabel = (value?: string) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString();
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await notificationService.getNotifications();
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load notifications';
      setError(message);
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const unreadItems = useMemo(() => items.filter((item) => !item.readAt), [items]);

  const getNotificationTypeLabel = (notificationType?: string) => {
    if (!notificationType) {
      return t('notifications.typeFallback', { defaultValue: 'Notification' });
    }

    return t(`notifications.types.${notificationType}`, {
      defaultValue: notificationType.replaceAll('_', ' '),
    });
  };

  const handleMarkOneAsRead = async (notificationId: string) => {
    try {
      setBusyId(notificationId);
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setBusyId('all');
      await notificationService.markAllAsRead();
      await loadNotifications();
    } finally {
      setBusyId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <AppBackground>
        <View style={styles.centeredCard}>
          <Text style={styles.title}>{t('nav.notifications', { defaultValue: 'Notifications' })}</Text>
          <Text style={styles.subtitle}>{t('chatbot.loginRequired')}</Text>
          <Link href={'/auth/login' as never} style={styles.loginLink}>{t('nav.login')}</Link>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>{t('nav.notifications', { defaultValue: 'Notifications' })}</Text>
              <Text style={styles.headerSubtitle}>
                {unreadCount > 0
                  ? t('notifications.unreadSummary', { defaultValue: `${unreadCount} unread notifications` })
                  : t('notifications.allRead', { defaultValue: 'Everything is up to date' })}
              </Text>
            </View>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleMarkAllAsRead}
              disabled={busyId === 'all' || unreadCount === 0}
              style={({ pressed }) => [
                styles.actionButton,
                (busyId === 'all' || unreadCount === 0) && styles.actionButtonDisabled,
                pressed && styles.actionButtonPressed,
              ]}
            >
              {busyId === 'all' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>{t('notifications.markAllRead', { defaultValue: 'Mark all read' })}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={AppTheme.colors.primary} />
            <Text style={styles.stateText}>{t('common.loading')}</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="warning-outline" size={24} color="#dc2626" />
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="notifications-off-outline" size={26} color={AppTheme.colors.primary} />
            <Text style={styles.stateText}>{t('notifications.empty', { defaultValue: 'No notifications yet' })}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => {
              const isUnread = !item.readAt;

              return (
                <View key={item._id} style={[styles.card, isUnread && styles.cardUnread]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleRow}>
                      <View style={[styles.dot, isUnread && styles.dotUnread]} />
                      <Text style={styles.cardTitle}>
                        {t(`notifications.titles.${item.type}`, { defaultValue: item.title })}
                      </Text>
                    </View>
                    <Text style={styles.cardDate}>{timeLabel(item.createdAt)}</Text>
                  </View>

                  <Text style={styles.cardContent}>{item.content}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.metaPill}>
                      <Ionicons name="link-outline" size={14} color="#475569" />
                      <Text style={styles.metaText}>{item.metadata?.serviceName || getNotificationTypeLabel(item.type)}</Text>
                    </View>

                    {isUnread ? (
                      <Pressable
                        onPress={() => handleMarkOneAsRead(item._id)}
                        disabled={busyId === item._id}
                        style={({ pressed }) => [
                          styles.readButton,
                          busyId === item._id && styles.actionButtonDisabled,
                          pressed && styles.actionButtonPressed,
                        ]}
                      >
                        <Text style={styles.readButtonText}>
                          {busyId === item._id ? t('common.loading') : t('notifications.markRead', { defaultValue: 'Mark read' })}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.readBadge}>
                        <Text style={styles.readBadgeText}>{t('notifications.read', { defaultValue: 'Read' })}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  headerCard: {
    borderRadius: AppTheme.radius.xl,
    backgroundColor: '#0f172a',
    padding: 18,
    ...AppTheme.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: 6,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 999,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: AppTheme.radius.lg,
    backgroundColor: '#ffffff',
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stateText: {
    textAlign: 'center',
    color: AppTheme.colors.mutedText,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: AppTheme.radius.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    ...AppTheme.shadow.card,
  },
  cardUnread: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  dotUnread: {
    backgroundColor: AppTheme.colors.primary,
  },
  cardTitle: {
    flex: 1,
    color: AppTheme.colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  cardDate: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    marginTop: 10,
    color: '#334155',
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  readButton: {
    borderRadius: 999,
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  readButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  readBadge: {
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readBadgeText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 12,
  },
  centeredCard: {
    margin: 16,
    borderRadius: AppTheme.radius.xl,
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...AppTheme.shadow.card,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: AppTheme.colors.mutedText,
    textAlign: 'center',
  },
  loginLink: {
    marginTop: 16,
    color: AppTheme.colors.primary,
    fontWeight: '800',
  },
});