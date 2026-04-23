import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { API_ENDPOINTS } from '@/services/apiConfig';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import type { ServiceItem } from '@/data/mockData';
import { servproDataService } from '@/services/servproDataService';

type ProviderApiItem = {
  _id?: string;
  id?: string;
  name?: string;
};

export default function ServiceDetailScreen() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [providers, setProviders] = useState<ProviderApiItem[]>([]);

  useEffect(() => {
    (async () => {
      const [servicesData, providersData] = await Promise.all([
        servproDataService.getServices(),
        apiService.get<{ items?: ProviderApiItem[] } | ProviderApiItem[]>(API_ENDPOINTS.PROVIDERS),
      ]);

      setServices(servicesData);
      setProviders(Array.isArray(providersData) ? providersData : providersData.items || []);
    })();
  }, []);

  const service = useMemo(() => services.find((item) => item._id === id), [id, services]);
  const providerName = useMemo(() => {
    if (!service?.provider) return '';
    if (typeof service.provider === 'string') {
      return providers.find((provider) => provider._id === service.provider || provider.id === service.provider)?.name || '';
    }
    return service.provider.name || '';
  }, [providers, service?.provider]);
  const providerId = useMemo(() => {
    if (!service?.provider) return '';
    if (typeof service.provider === 'string') return service.provider;
    return service.provider._id || '';
  }, [service?.provider]);

  const renderAction = () => {
    if (!isAuthenticated) {
      return (
        <Pressable style={styles.bookBtn} onPress={() => router.push('/auth/login' as never)}>
          <Text style={styles.bookBtnText}>{t('nav.login')}</Text>
        </Pressable>
      );
    }

    if (user?.type === 'CLIENT') {
      return (
        <Pressable
          style={styles.bookBtn}
          onPress={() => router.push(`/booking/${service?._id}` as never)}>
          <Text style={styles.bookBtnText}>{t('service.bookNow')}</Text>
        </Pressable>
      );
    }

    return <Text style={styles.helperText}>{t('service.onlyClients')}</Text>;
  };

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content}>
        {service ? (
          <View style={styles.card}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t(`services.categories.${service.category}`)}</Text>
            </View>
            <Text style={styles.title}>{t(service.name, { defaultValue: service.name })}</Text>
            <Text style={styles.description}>{service.description || t('services.descriptionFallback')}</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('service.from')}</Text>
                <Text style={styles.metricValue}>{service.priceMin} {service.currency}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>{t('service.duration')}</Text>
                <Text style={styles.metricValue}>{t('service.minutes', { count: service.duration })}</Text>
              </View>
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>{t('service.providerAbout')}</Text>
              <Text style={styles.noteText}>
                {providerName || t('providers.fallbackName', { defaultValue: 'Provider' })}
              </Text>

              {providerId ? (
                <Pressable
                  style={styles.portfolioBtn}
                  onPress={() => router.push(`/providers/${providerId}` as never)}>
                  <Text style={styles.portfolioBtnText}>{t('providers.openPortfolio')}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.actionWrap}>
              {renderAction()}
            </View>
          </View>
        ) : (
          <Text style={styles.notFound}>{t('service.notFound')}</Text>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  card: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
    ...AppTheme.shadow.card,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(15,118,110,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    color: AppTheme.colors.primary,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    color: AppTheme.colors.text,
  },
  description: {
    marginTop: 10,
    color: AppTheme.colors.mutedText,
    lineHeight: 22,
    fontSize: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: AppTheme.colors.text,
    marginTop: 4,
    fontSize: 19,
    fontWeight: '900',
  },
  noteBox: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    padding: 14,
  },
  noteTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  noteText: {
    marginTop: 6,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  portfolioBtn: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  portfolioBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actionWrap: {
    marginTop: 16,
  },
  bookBtn: {
    borderRadius: 12,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
  },
  bookBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  helperText: {
    color: AppTheme.colors.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
  notFound: {
    marginTop: 30,
    textAlign: 'center',
    color: AppTheme.colors.mutedText,
  },
});
