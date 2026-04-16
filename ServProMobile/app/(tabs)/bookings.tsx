import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { AppBackground } from '@/components/servpro/AppBackground';
import { SectionHeader } from '@/components/servpro/SectionHeader';
import { AppTheme, getResponsiveLayout } from '@/constants/theme';
import type { BookingItem } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { servproDataService } from '@/services/servproDataService';

const statusColors: Record<BookingItem['status'], string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#0f766e',
  COMPLETED: '#2563eb',
  IN_PROGRESS: '#0ea5e9',
  DONE: '#2563eb',
  CANCELLED: '#dc2626',
};

const toDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function BookingsScreen() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const responsive = getResponsiveLayout(width);
  const [bookings, setBookings] = useState<BookingItem[]>([]);

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setBookings([]);
      return;
    }
    const userId = user?._id ?? user?.id;
    const data = await servproDataService.getBookings(
      user?.type === 'PROVIDER'
        ? { providerId: userId }
        : { clientId: userId },
    );
    setBookings(data);
  }, [isAuthenticated, user?._id, user?.id, user?.type]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  const bookingStats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((booking) => booking.status === 'CONFIRMED').length;
    const pending = bookings.filter((booking) => booking.status === 'PENDING').length;

    return { total, confirmed, pending };
  }, [bookings]);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((left, right) => {
      const leftDate = toDate(left.scheduledAt)?.getTime() ?? 0;
      const rightDate = toDate(right.scheduledAt)?.getTime() ?? 0;
      return leftDate - rightDate;
    });
  }, [bookings]);

  if (!isAuthenticated) {
    return (
      <AppBackground>
        <View style={styles.centeredCard}>
          <Text style={styles.title}>{t('booking.myBookings')}</Text>
          <Text style={styles.subtitle}>{t('chatbot.loginRequired')}</Text>
          <Link href={'/auth/login' as never} style={styles.loginLink}>{t('nav.login')}</Link>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: responsive.horizontalPadding }]}>
        <View style={[styles.contentWrap, { maxWidth: responsive.contentMaxWidth }]}> 
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroTitle}>{t('booking.myBookings')}</Text>
              <Text style={styles.heroSubtitle}>{t('booking.loading')}</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar-outline" size={24} color="#ffffff" />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{bookingStats.total}</Text>
              <Text style={styles.statLabel}>{t('booking.statusAll')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{bookingStats.confirmed}</Text>
              <Text style={styles.statLabel}>{t('booking.status.CONFIRMED')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{bookingStats.pending}</Text>
              <Text style={styles.statLabel}>{t('booking.status.PENDING')}</Text>
            </View>
          </View>
        </View>

        {sortedBookings.length > 0 ? (
          <View style={styles.listSection}>
            <SectionHeader title={t('booking.myBookings')} rightLabel={`${sortedBookings.length} ${t('booking.statusAll').toLowerCase()}`} />

            {sortedBookings.map((booking) => {
              const parsedDate = toDate(booking.scheduledAt);
              const shortDate = parsedDate ? parsedDate.toLocaleDateString() : '--';
              const fullDate = parsedDate ? parsedDate.toLocaleString() : '--';

              return (
              <View key={booking._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.serviceBlock}>
                    <View style={styles.serviceIconWrap}>
                      <Ionicons name="construct-outline" size={18} color={AppTheme.colors.primary} />
                    </View>
                    <View style={styles.serviceCopy}>
                      <Text style={styles.serviceName}>{t(booking.serviceName, { defaultValue: booking.serviceName })}</Text>
                      <Text style={styles.provider}>{booking.providerName}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: `${statusColors[booking.status]}22` }]}>
                    <Text style={[styles.statusText, { color: statusColors[booking.status] }]}>
                      {t(`booking.status.${booking.status}`, { defaultValue: booking.status })}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText}>{shortDate}</Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Ionicons name="cash-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText}>{booking.amount} {booking.currency}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterLabel}>{t('booking.date')}</Text>
                  <Text style={styles.cardFooterValue}>{fullDate}</Text>
                </View>
              </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-clear-outline" size={26} color={AppTheme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('booking.none')}</Text>
            <Text style={styles.emptyText}>{t('chatbot.welcomeMessage')}</Text>
            <Link href={'/services' as never} style={styles.emptyLink}>{t('booking.browseServices')}</Link>
          </View>
        )}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  contentWrap: {
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#0f766e1a',
    backgroundColor: '#0f172a',
    padding: 18,
    marginBottom: 16,
    ...AppTheme.shadow.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  heroSubtitle: {
    marginTop: 4,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 4,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  listSection: {
    gap: 8,
  },
  centeredCard: {
    margin: 16,
    marginTop: 80,
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 20,
    ...AppTheme.shadow.card,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: AppTheme.colors.text,
  },
  subtitle: {
    marginTop: 8,
    color: AppTheme.colors.mutedText,
    lineHeight: 21,
  },
  loginLink: {
    marginTop: 14,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    fontWeight: '800',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 12,
    ...AppTheme.shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  serviceBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,118,110,0.10)',
  },
  serviceCopy: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    color: AppTheme.colors.text,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  provider: {
    marginTop: 3,
    color: AppTheme.colors.mutedText,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
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
  cardFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  cardFooterLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardFooterValue: {
    marginTop: 4,
    color: AppTheme.colors.text,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    ...AppTheme.shadow.card,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,118,110,0.10)',
    marginBottom: 12,
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: AppTheme.colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyLink: {
    marginTop: 14,
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
});
