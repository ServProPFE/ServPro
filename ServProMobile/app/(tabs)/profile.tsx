import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith('en');
  const isArabic = i18n.language.startsWith('ar');

  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() ?? 'S'}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t('mobile.profile', { defaultValue: 'Profile' })}</Text>
              <Text style={styles.subtitle}>
                {isAuthenticated && user
                  ? t('nav.hello', { name: user.name })
                  : t('mobile.guestSubtitle', { defaultValue: t('auth.noAccount') })}
              </Text>
            </View>
            {isAuthenticated ? (
              <Pressable style={styles.headerLogoutBtn} onPress={() => logout()}>
                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.languageRow}>
            <Text style={styles.languageLabel}>{t('nav.language')}:</Text>
            <Pressable
              onPress={() => i18n.changeLanguage('en')}
              style={[styles.langBtn, isEnglish && styles.langBtnActive]}>
              <Text style={[styles.langText, isEnglish && styles.langTextActive]}>EN</Text>
            </Pressable>
            <Pressable
              onPress={() => i18n.changeLanguage('ar')}
              style={[styles.langBtn, isArabic && styles.langBtnActive]}>
              <Text style={[styles.langText, isArabic && styles.langTextActive]}>AR</Text>
            </Pressable>
          </View>
        </View>

        {isAuthenticated && user ? (
          <View style={styles.stack}>
            <View style={styles.summaryGrid}>
              <View style={styles.metricCard}>
                <Ionicons name="person-outline" size={18} color={AppTheme.colors.primary} />
                <Text style={styles.metricLabel}>{t('auth.accountType')}</Text>
                <Text style={styles.metricValue}>{user.type === 'CLIENT' ? t('auth.client') : t('auth.provider')}</Text>
              </View>
              <View style={styles.metricCard}>
                <Ionicons name="mail-outline" size={18} color={AppTheme.colors.secondary} />
                <Text style={styles.metricLabel}>{t('mobile.contactInfo', { defaultValue: t('auth.email') })}</Text>
                <Text style={styles.metricValue} numberOfLines={1}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('mobile.accountSummary', { defaultValue: t('mobile.profile') })}</Text>
                <Text style={styles.sectionBadge}>{t('mobile.secureAccess', { defaultValue: t('chatbot.title') })}</Text>
              </View>
              <Text style={styles.info}>{t('mobile.profileSubtitle', { defaultValue: t('auth.subtitle') })}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.name')}</Text>
                <Text style={styles.detailValue}>{user.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('auth.email')}</Text>
                <Text style={styles.detailValue}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('mobile.quickActions', { defaultValue: t('nav.services') })}</Text>
              </View>

              <View style={styles.actionList}>
                <Link href={'/services' as never} style={styles.actionItem}>
                  <Ionicons name="grid-outline" size={18} color={AppTheme.colors.primary} />
                  <Text style={styles.actionText}>{t('nav.services')}</Text>
                </Link>
                <Link href={'/bookings' as never} style={styles.actionItem}>
                  <Ionicons name="calendar-outline" size={18} color={AppTheme.colors.secondary} />
                  <Text style={styles.actionText}>{t('nav.myBookings')}</Text>
                </Link>
                <Link href={'/transactions' as never} style={styles.actionItem}>
                  <Ionicons name="wallet-outline" size={18} color={AppTheme.colors.primary} />
                  <Text style={styles.actionText}>{t('nav.myTransactions')}</Text>
                </Link>
              </View>

              <Pressable style={styles.logoutBtn} onPress={() => logout()}>
                <Ionicons name="log-out-outline" size={18} color="#ffffff" />
                <Text style={styles.logoutText}>{t('nav.logout')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.guestHero}>
              <Text style={styles.name}>{t('mobile.guestTitle', { defaultValue: t('chatbot.welcome') })}</Text>
              <Text style={styles.info}>{t('mobile.guestSubtitle', { defaultValue: t('auth.noAccount') })}</Text>
            </View>

            <View style={styles.guestStats}>
              <View style={styles.guestStatItem}>
                <Ionicons name="shield-checkmark-outline" size={18} color={AppTheme.colors.primary} />
                <Text style={styles.guestStatText}>{t('mobile.secureAccess', { defaultValue: t('chatbot.subtitle') })}</Text>
              </View>
              <View style={styles.guestStatItem}>
                <Ionicons name="sparkles-outline" size={18} color={AppTheme.colors.secondary} />
                <Text style={styles.guestStatText}>{t('hero.subtitle')}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Link href={'/auth/login' as never} style={styles.primaryLink}>{t('nav.login')}</Link>
              <Link href={'/auth/register' as never} style={styles.secondaryLink}>{t('nav.register')}</Link>
            </View>
          </View>
        )}
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#0f172a',
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
    ...AppTheme.shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerLogoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 4,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  languageLabel: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  langBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f8fafc',
  },
  langBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  langText: {
    color: '#334155',
    fontWeight: '800',
  },
  langTextActive: {
    color: '#ffffff',
  },
  stack: {
    gap: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    ...AppTheme.shadow.card,
  },
  metricLabel: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 4,
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
    ...AppTheme.shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionBadge: {
    color: AppTheme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: AppTheme.colors.text,
  },
  info: {
    color: AppTheme.colors.mutedText,
    marginTop: 6,
    lineHeight: 20,
  },
  detailRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  actionList: {
    gap: 10,
    marginTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionText: {
    color: AppTheme.colors.text,
    fontWeight: '800',
  },
  row: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  primaryLink: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontWeight: '800',
    overflow: 'hidden',
  },
  secondaryLink: {
    backgroundColor: 'rgba(15,118,110,0.12)',
    color: '#0f766e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontWeight: '800',
    overflow: 'hidden',
  },
  logoutBtn: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  guestHero: {
    gap: 4,
  },
  guestStats: {
    marginTop: 14,
    gap: 10,
  },
  guestStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  guestStatText: {
    flex: 1,
    color: AppTheme.colors.text,
    fontWeight: '700',
    lineHeight: 18,
  },
});
