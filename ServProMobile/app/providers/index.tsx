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
  location?: string | Record<string, unknown>;
  address?: string;
  city?: string;
  providerProfile?: {
    companyName?: string;
    verificationStatus?: string;
    location?: string | Record<string, unknown>;
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
  location: string;
  companyName: string;
  verificationStatus: string;
  servicesCount: number;
  portfoliosCount: number;
};

type ProviderFilter = 'all' | 'verified' | 'active' | 'portfolio';

type ProviderAnalytics = {
  total: number;
  verified: number;
  averageServices: number;
  topProvider: ProviderCard | null;
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

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

const firstNonEmpty = (...values: Array<unknown>) => values.find((value) => hasValue(value));

const normalizeText = (value: string) => value.normalize('NFD').replaceAll(/\p{Diacritic}/gu, '').toLowerCase().trim();

const scoreProvider = (provider: ProviderCard, query: string) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return provider.servicesCount + provider.portfoliosCount + (provider.verificationStatus.toLowerCase() === 'verified' ? 2 : 0);
  }

  const haystack = normalizeText([
    provider.name,
    provider.companyName,
    provider.location,
    provider.email,
    provider.phone,
    provider.verificationStatus,
  ].join(' '));

  let score = 0;
  if (haystack.startsWith(normalizedQuery)) score += 4;
  if (haystack.includes(normalizedQuery)) score += 3;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedTokens = tokens.filter((token) => haystack.includes(token)).length;
  score += matchedTokens * 2;

  if (matchedTokens === tokens.length) {
    score += 2;
  }

  score += provider.servicesCount * 0.2;
  score += provider.portfoliosCount * 0.3;

  if (provider.verificationStatus.toLowerCase() === 'verified') {
    score += 1;
  }

  return score;
};

const formatLocation = (provider: ProviderApiItem, fallback: string) => {
  const raw = firstNonEmpty(
    provider.providerProfile?.location,
    provider.location,
    provider.address,
    provider.city,
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

export default function ProvidersScreen() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ProviderCard[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProviderFilter>('all');
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
              location: formatLocation(provider, t('providers.noLocation')),
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
    const matching = providers.filter((provider) => {
      const verification = provider.verificationStatus.trim().toLowerCase();
      const isVerified = verification !== 'pending' && verification !== 'unknown';
      const isActive = provider.servicesCount + provider.portfoliosCount >= 3;
      const isPortfolioRich = provider.portfoliosCount >= 2;

      if (filter === 'verified' && !isVerified) return false;
      if (filter === 'active' && !isActive) return false;
      if (filter === 'portfolio' && !isPortfolioRich) return false;

      return true;
    });

    return matching
      .map((provider) => ({ provider, score: scoreProvider(provider, query) }))
      .filter(({ score }) => !query || score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ provider }) => provider);
  }, [filter, providers, search]);

  const analytics = useMemo<ProviderAnalytics>(() => {
    if (providers.length === 0) {
      return {
        total: 0,
        verified: 0,
        averageServices: 0,
        topProvider: null,
      };
    }

    const verified = providers.filter((provider) => {
      const verification = provider.verificationStatus.trim().toLowerCase();
      return verification !== 'pending' && verification !== 'unknown';
    }).length;

    const averageServices = Math.round(
      providers.reduce((sum, provider) => sum + provider.servicesCount, 0) / providers.length,
    );

    const topProvider = providers
      .slice()
      .sort((left, right) => {
        const leftScore = left.servicesCount + left.portfoliosCount + (left.verificationStatus.toLowerCase() === 'verified' ? 2 : 0);
        const rightScore = right.servicesCount + right.portfoliosCount + (right.verificationStatus.toLowerCase() === 'verified' ? 2 : 0);
        return rightScore - leftScore;
      })[0] || null;

    return {
      total: providers.length,
      verified,
      averageServices,
      topProvider,
    };
  }, [providers]);

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

          <View style={styles.filterRow}>
            {[
              { key: 'all' as const, label: t('providers.filterAll') },
              { key: 'verified' as const, label: t('providers.filterVerified') },
              { key: 'active' as const, label: t('providers.filterActive') },
              { key: 'portfolio' as const, label: t('providers.filterPortfolio') },
            ].map((item) => (
              <Pressable
                key={item.key}
                style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>{t('providers.analyticsTitle')}</Text>
          <Text style={styles.analyticsSubtitle}>{t('providers.analyticsSubtitle')}</Text>

          <View style={styles.analyticsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.total}</Text>
              <Text style={styles.metricLabel}>{t('providers.title')}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.verified}</Text>
              <Text style={styles.metricLabel}>{t('providers.filterVerified')}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.averageServices}</Text>
              <Text style={styles.metricLabel}>{t('providers.avgServices')}</Text>
            </View>
          </View>

          <View style={styles.topProviderCard}>
            <Text style={styles.topProviderLabel}>{t('providers.topProvider')}</Text>
            <Text style={styles.topProviderValue}>{analytics.topProvider?.name || t('providers.empty')}</Text>
            {analytics.topProvider ? (
              <Text style={styles.topProviderMeta}>
                {analytics.topProvider.servicesCount} {t('providers.services')} · {analytics.topProvider.portfoliosCount} {t('providers.portfolios')}
              </Text>
            ) : null}
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
                    <Text style={styles.meta}>{t('providers.location')}: {provider.location}</Text>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  filterChipText: {
    color: '#334155',
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  analyticsCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    padding: 16,
    ...AppTheme.shadow.card,
  },
  analyticsTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  analyticsSubtitle: {
    color: AppTheme.colors.mutedText,
    marginTop: 4,
    lineHeight: 20,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#64748b',
    marginTop: 4,
    fontWeight: '700',
  },
  topProviderCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
  },
  topProviderLabel: {
    color: '#0f766e',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topProviderValue: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  topProviderMeta: {
    color: '#475569',
    marginTop: 4,
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
