import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await notificationService.getNotifications();
      setItems(result.items);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load notifications';
      setError(message);
      setItems([]);
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

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);
  const totalCount = items.length;
  const recentItems = useMemo(() => items.slice(0, 3), [items]);
  let previewContent = null;

  if (loading) {
    previewContent = (
      <View style={styles.stateCard}>
        <ActivityIndicator color={AppTheme.colors.primary} />
        <Text style={styles.stateText}>{t('common.loading')}</Text>
      </View>
    );
  } else if (error) {
    previewContent = (
      <View style={styles.stateCard}>
        <Ionicons name="warning-outline" size={24} color="#dc2626" />
        <Text style={styles.stateText}>{error}</Text>
      </View>
    );
  } else if (recentItems.length > 0) {
    previewContent = (
      <View style={styles.previewList}>
        {recentItems.map((item) => (
          <View key={item._id} style={styles.previewItem}>
            <View style={styles.previewDot} />
            <View style={styles.previewTextWrap}>
              <Text style={styles.previewItemTitle}>{t(`notifications.titles.${item.type}`, { defaultValue: item.title })}</Text>
              <Text style={styles.previewItemMeta}>{timeLabel(item.createdAt) || t('notifications.system', { defaultValue: 'System' })}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  } else {
    previewContent = (
      <View style={styles.stateCard}>
        <Ionicons name="notifications-off-outline" size={26} color={AppTheme.colors.primary} />
        <Text style={styles.stateText}>{t('notifications.empty', { defaultValue: 'No notifications yet' })}</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppBackground>
        <View style={styles.centeredCard}>
          <Ionicons name="notifications-outline" size={28} color={AppTheme.colors.primary} />
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
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t('nav.notifications', { defaultValue: 'Notifications' })}</Text>
              <Text style={styles.heroSubtitle}>
                {t('notifications.subtitle', { defaultValue: 'Keep track of booking, payment, and service updates.' })}
                {user?.name ? ` ${t('nav.hello', { name: user.name })}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryPillUnread}>
              <Text style={styles.summaryPillText}>{unreadCount} {t('notifications.unread', { defaultValue: 'Unread' })}</Text>
            </View>
            <View style={styles.summaryPillTotal}>
              <Text style={[styles.summaryPillText, styles.summaryPillTextLight]}>{totalCount} {t('notifications.total', { defaultValue: 'total' })}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Link href={'/modal' as never} asChild>
              <Pressable style={({ pressed }) => [styles.openButton, pressed && styles.buttonPressed]}>
                <Text style={styles.openButtonText}>{t('notifications.openCenter', { defaultValue: 'Open notification center' })}</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>{t('notifications.recentTitle', { defaultValue: 'Recent updates' })}</Text>
          {previewContent}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    borderRadius: AppTheme.radius.xl,
    backgroundColor: '#0f172a',
    padding: 18,
    ...AppTheme.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  heroSubtitle: {
    marginTop: 6,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  summaryRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryPillUnread: {
    borderRadius: 999,
    backgroundColor: '#ecfeff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryPillTotal: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryPillText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryPillTextLight: {
    color: '#fff',
  },
  actionsRow: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  openButton: {
    borderRadius: 999,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  openButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  previewCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    ...AppTheme.shadow.card,
  },
  previewTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  previewList: {
    gap: 10,
  },
  previewItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  previewDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.primary,
  },
  previewTextWrap: {
    flex: 1,
  },
  previewItemTitle: {
    color: AppTheme.colors.text,
    fontWeight: '800',
  },
  previewItemMeta: {
    color: '#64748b',
    marginTop: 2,
    fontSize: 12,
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
