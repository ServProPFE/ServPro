import { useEffect, useMemo, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { API_ENDPOINTS } from '@/services/apiConfig';
import { apiService } from '@/services/apiService';

type ProviderApiItem = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string | Record<string, unknown>;
  address?: string;
  city?: string;
  providerProfile?: {
    companyName?: string;
    experienceYears?: number;
    verificationStatus?: string;
    serviceRadius?: number;
    equipments?: string[] | string;
    teamMembers?: string[] | string;
    location?: string | Record<string, unknown>;
    turnover?: string;
    chiffrement?: string;
  };
};

type PortfolioItem = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  images?: string[];
};

type ServiceItem = {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  priceMin?: number;
  currency?: string;
  duration?: number;
};

type AvailabilityItem = {
  _id?: string;
  day?: number;
  start?: string;
  end?: string;
};

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toArray = <T,>(payload: { items?: T[] } | T[] | undefined): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const normalizeList = (value: string[] | string | undefined) => {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => item.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

const firstNonEmpty = (...values: Array<unknown>) => values.find((value) => hasValue(value));

const formatLocation = (provider: ProviderApiItem | null, fallback: string) => {
  const raw = firstNonEmpty(
    provider?.providerProfile?.location,
    provider?.location,
    provider?.address,
    provider?.city,
  );

  if (!raw) {
    return fallback;
  }

  if (typeof raw === 'string') {
    return raw;
  }

  if (typeof raw === 'object') {
    const values = Object.values(raw)
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    return values.join(', ') || fallback;
  }

  return fallback;
};

export default function ProviderPortfolioScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const { t } = useTranslation();

  const [provider, setProvider] = useState<ProviderApiItem | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!providerId) return;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [providersRes, servicesRes, portfolioRes, availabilityRes] = await Promise.all([
          apiService.get<{ items?: ProviderApiItem[] } | ProviderApiItem[]>(API_ENDPOINTS.PROVIDERS),
          apiService.get<{ items?: ServiceItem[] } | ServiceItem[]>(API_ENDPOINTS.SERVICES_BY_PROVIDER(providerId)),
          apiService.get<{ items?: PortfolioItem[] } | PortfolioItem[]>(API_ENDPOINTS.PORTFOLIOS_BY_PROVIDER(providerId)),
          apiService.get<{ items?: AvailabilityItem[] } | AvailabilityItem[]>(API_ENDPOINTS.AVAILABILITY_BY_PROVIDER(providerId)),
        ]);

        const providerItems = toArray(providersRes);
        const selectedProvider = providerItems.find((item) => String(item._id || item.id) === String(providerId));

        setProvider(selectedProvider || null);
        setServices(toArray(servicesRes));
        setPortfolio(toArray(portfolioRes));
        setAvailability(toArray(availabilityRes));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('common.error', { message: 'Unknown error' }));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [providerId, t]);

  const profile = provider?.providerProfile;

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{provider?.name || t('providers.portfolioTitle')}</Text>
          <Text style={styles.subtitle}>{t('providers.portfolioSubtitle')}</Text>
        </View>

        {loading ? <Text style={styles.feedbackText}>{t('providers.loadingPortfolio')}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('providers.infoTitle')}</Text>
              <Text style={styles.infoLine}>{t('providers.company')}: {profile?.companyName || '-'}</Text>
              <Text style={styles.infoLine}>{t('auth.email')}: {provider?.email || '-'}</Text>
              <Text style={styles.infoLine}>{t('auth.phone')}: {provider?.phone || '-'}</Text>
              <Text style={styles.infoLine}>{t('service.experience')}: {profile?.experienceYears || 0}</Text>
              <Text style={styles.infoLine}>{t('providers.verification')}: {profile?.verificationStatus || 'PENDING'}</Text>
              <Text style={styles.infoLine}>{t('providers.location')}: {formatLocation(provider, t('providers.noLocation'))}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('providers.services')}</Text>
              {services.map((service) => (
                <View key={service._id || service.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{service.name || t('services.title')}</Text>
                  <Text style={styles.rowSub}>{service.category || '-'}</Text>
                  <Text style={styles.rowSub}>{service.priceMin || 0} {service.currency || 'TND'} • {service.duration || 0} min</Text>
                </View>
              ))}
              {services.length === 0 ? <Text style={styles.muted}>{t('providers.emptyServices')}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('providers.portfolios')}</Text>
              {portfolio.map((entry) => (
                <View key={entry._id || entry.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{entry.title || t('providers.portfolioFallbackTitle')}</Text>
                  <Text style={styles.rowSub}>{entry.description || t('providers.portfolioFallbackDescription')}</Text>

                  <View style={styles.imagesGrid}>
                    {(entry.images || []).filter(Boolean).slice(0, 4).map((image, index) => (
                      <Image key={`${entry._id || entry.id}-${index}`} source={{ uri: image }} style={styles.image} resizeMode="cover" />
                    ))}
                  </View>
                </View>
              ))}
              {portfolio.length === 0 ? <Text style={styles.muted}>{t('providers.emptyPortfolio')}</Text> : null}
            </View>


            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('providers.availability')}</Text>
              {availability.map((slot) => (
                <View key={slot._id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{dayLabels[slot.day || 0] || '-'}</Text>
                  <Text style={styles.rowSub}>{slot.start || '--:--'} - {slot.end || '--:--'}</Text>
                </View>
              ))}
              {availability.length === 0 ? <Text style={styles.muted}>{t('providers.emptyAvailability')}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('providers.turnover')}</Text>
              <Text style={styles.infoLine}>{profile?.turnover || profile?.chiffrement || '-'}</Text>
            </View>
          </>
        ) : null}

        <Link href={'/providers' as never} style={styles.backLink}>{t('providers.backToList')}</Link>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  headerCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    ...AppTheme.shadow.card,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: AppTheme.colors.mutedText,
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    ...AppTheme.shadow.card,
  },
  cardTitle: {
    color: AppTheme.colors.text,
    fontWeight: '900',
    fontSize: 17,
    marginBottom: 8,
  },
  infoLine: {
    color: '#334155',
    lineHeight: 20,
    marginTop: 4,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    marginTop: 8,
  },
  rowTitle: {
    color: AppTheme.colors.text,
    fontWeight: '800',
  },
  rowSub: {
    color: '#475569',
    marginTop: 3,
  },
  imagesGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  image: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#e2e8f0',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
  },
  listLine: {
    color: '#334155',
    marginTop: 5,
  },
  muted: {
    color: AppTheme.colors.mutedText,
  },
  feedbackText: {
    color: AppTheme.colors.mutedText,
    textAlign: 'center',
    fontWeight: '700',
  },
  errorText: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    padding: 10,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#0f172a',
    fontWeight: '800',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
});
