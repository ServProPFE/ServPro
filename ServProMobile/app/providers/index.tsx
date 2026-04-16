import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  providerProfile?: {
    companyName?: string;
    verificationStatus?: string;
  };
};

type ServiceApiItem = {
  provider?: string | { _id?: string; id?: string };
};

type PortfolioApiItem = {
  provider?: string | { _id?: string; id?: string };
};

type ProviderCard = {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  verificationStatus: string;
  servicesCount: number;
  portfoliosCount: number;
};

const toArray = <T,>(payload: { items?: T[] } | T[] | undefined): T[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const getProviderId = (value: string | { _id?: string; id?: string } | undefined) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

export default function ProvidersScreen() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [providersRes, servicesRes, portfoliosRes] = await Promise.all([
          apiService.get<{ items?: ProviderApiItem[] } | ProviderApiItem[]>(API_ENDPOINTS.PROVIDERS),
          apiService.get<{ items?: ServiceApiItem[] } | ServiceApiItem[]>(API_ENDPOINTS.SERVICES),
          apiService.get<{ items?: PortfolioApiItem[] } | PortfolioApiItem[]>(API_ENDPOINTS.PORTFOLIOS),
        ]);

        const providerItems = toArray(providersRes);
        const serviceItems = toArray(servicesRes);
        const portfolioItems = toArray(portfoliosRes);

        const serviceMap = new Map<string, number>();
        for (const service of serviceItems) {
          const providerId = getProviderId(service.provider);
          if (!providerId) continue;
          serviceMap.set(providerId, (serviceMap.get(providerId) || 0) + 1);
        }

        const portfolioMap = new Map<string, number>();
        for (const portfolio of portfolioItems) {
          const providerId = getProviderId(portfolio.provider);
          if (!providerId) continue;
          portfolioMap.set(providerId, (portfolioMap.get(providerId) || 0) + 1);
        }

        const mapped = providerItems
          .map((provider) => {
            const id = provider._id || provider.id || '';
            if (!id) return null;

            return {
              id,
              name: provider.name || t('providers.fallbackName'),
              email: provider.email || '-',
              phone: provider.phone || '-',
              companyName: provider.providerProfile?.companyName || '-',
              verificationStatus: provider.providerProfile?.verificationStatus || 'PENDING',
              servicesCount: serviceMap.get(id) || 0,
              portfoliosCount: portfolioMap.get(id) || 0,
            };
          })
          .filter((provider): provider is ProviderCard => !!provider)
          .sort((a, b) => a.name.localeCompare(b.name));

        setProviders(mapped);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('common.error', { message: 'Unknown error' }));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  const filteredProviders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return providers;

    return providers.filter((provider) =>
      [provider.name, provider.companyName].join(' ').toLowerCase().includes(query),
    );
  }, [providers, search]);

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{t('providers.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('providers.subtitle')}</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('providers.searchPlaceholder')}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {loading ? <Text style={styles.feedbackText}>{t('providers.loading')}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loading && !error ? (
          <>
            <Text style={styles.countText}>{t('providers.count', { value: filteredProviders.length })}</Text>

            {filteredProviders.map((provider) => (
              <View key={provider.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatarWrap}>
                    <Ionicons name="person" size={18} color="#0f766e" />
                  </View>
                  <View style={styles.cardMain}>
                    <Text style={styles.name}>{provider.name}</Text>
                    <Text style={styles.meta}>{provider.email}</Text>
                    <Text style={styles.meta}>{provider.phone}</Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.pill}><Text style={styles.pillText}>{t('providers.company')}: {provider.companyName}</Text></View>
                  <View style={styles.pill}><Text style={styles.pillText}>{t('providers.verification')}: {provider.verificationStatus}</Text></View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{provider.servicesCount}</Text>
                    <Text style={styles.statLabel}>{t('providers.services')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{provider.portfoliosCount}</Text>
                    <Text style={styles.statLabel}>{t('providers.portfolios')}</Text>
                  </View>
                </View>

                <Link href={`/providers/${provider.id}` as never} style={styles.portfolioLink}>
                  {t('providers.openPortfolio')}
                </Link>
              </View>
            ))}

            {filteredProviders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.feedbackText}>{t('providers.empty')}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        <Link href={'/services' as never} asChild>
          <Pressable style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t('services.title')}</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    gap: 12,
  },
  heroCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    ...AppTheme.shadow.card,
  },
  heroTitle: {
    color: AppTheme.colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: AppTheme.colors.mutedText,
    marginTop: 6,
    lineHeight: 20,
  },
  searchWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: AppTheme.colors.text,
    fontWeight: '600',
  },
  countText: {
    color: '#334155',
    fontWeight: '700',
  },
  card: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    ...AppTheme.shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 10,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,118,110,0.12)',
  },
  cardMain: {
    flex: 1,
  },
  name: {
    color: AppTheme.colors.text,
    fontWeight: '900',
    fontSize: 17,
  },
  meta: {
    color: '#64748b',
    marginTop: 2,
  },
  infoGrid: {
    marginTop: 10,
    gap: 6,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pillText: {
    color: '#334155',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    color: '#1e3a8a',
    fontWeight: '900',
    fontSize: 18,
  },
  statLabel: {
    color: '#334155',
    marginTop: 2,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  portfolioLink: {
    marginTop: 12,
    backgroundColor: AppTheme.colors.primary,
    color: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '800',
    textAlign: 'center',
    overflow: 'hidden',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
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
  backBtn: {
    marginTop: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
  },
  backBtnText: {
    color: '#0f172a',
    fontWeight: '800',
  },
});
