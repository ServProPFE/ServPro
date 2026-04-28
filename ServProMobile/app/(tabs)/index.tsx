import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { Hero } from '@/components/servpro/Hero';
import { OfferCard } from '@/components/servpro/OfferCard';
import { SectionHeader } from '@/components/servpro/SectionHeader';
import { ServiceCard } from '@/components/servpro/ServiceCard';
import { AppTheme, getResponsiveLayout } from '@/constants/theme';
import { API_ENDPOINTS } from '@/services/apiConfig';
import { apiService } from '@/services/apiService';
import { servproDataService } from '@/services/servproDataService';
import type { OfferItem, ServiceItem } from '@/data/mockData';

type SuggestionsResponse = {
  suggestions?: string[];
  en?: string[];
  ar?: string[];
};

const normalizeText = (value: string) => value.normalize('NFD').replaceAll(/\p{Diacritic}/gu, '').toLowerCase().trim();

const resolveSuggestions = (payload: SuggestionsResponse, lang: 'en' | 'ar') => {
  if (Array.isArray(payload.suggestions)) return payload.suggestions;
  if (Array.isArray(payload[lang])) return payload[lang];
  if (Array.isArray(payload.en)) return payload.en;
  return [];
};

const scoreService = (service: ServiceItem, query: string, t: (key: string, options?: { defaultValue?: string }) => string) => {
  const haystack = normalizeText([
    t(service.name, { defaultValue: service.name }),
    service.name,
    service.description,
    service.category,
    t(`services.categories.${service.category}`, { defaultValue: service.category }),
  ].join(' '));

  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return 0;
  }

  let score = 0;
  if (haystack.startsWith(normalizeText(query))) score += 4;
  if (haystack.includes(normalizeText(query))) score += 3;

  const matchedTokens = tokens.filter((token) => haystack.includes(token)).length;
  score += matchedTokens * 2;

  if (matchedTokens === tokens.length) {
    score += 2;
  }

  return score;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [search, setSearch] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const responsive = getResponsiveLayout(width);
  const language = useMemo<'en' | 'ar'>(
    () => (i18n.language?.startsWith('ar') ? 'ar' : 'en'),
    [i18n.language],
  );

  useEffect(() => {
    (async () => {
      const [servicesData, offersData] = await Promise.all([
        servproDataService.getServices(),
        servproDataService.getOffers(),
      ]);
      setServices(servicesData);
      setOffers(offersData);
    })();
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadSmartSuggestions = async () => {
      setSuggestionsLoading(true);

      try {
        const payload = await apiService.get<SuggestionsResponse>(`${API_ENDPOINTS.CHATBOT_SUGGESTIONS}?language=${language}`);
        if (isActive) {
          setSmartSuggestions(resolveSuggestions(payload, language));
        }
      } catch {
        if (isActive) {
          setSmartSuggestions([]);
        }
      } finally {
        if (isActive) {
          setSuggestionsLoading(false);
        }
      }
    };

    void loadSmartSuggestions();

    return () => {
      isActive = false;
    };
  }, [language]);

  const filteredServices = useMemo(() => {
    if (!search.trim()) {
      return services;
    }
    return services
      .map((service) => ({ service, score: scoreService(service, search, t) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ service }) => service);
  }, [search, services, t]);

  return (
    <AppBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: responsive.horizontalPadding }]}
      >
        <View style={[styles.contentWrap, { maxWidth: responsive.contentMaxWidth }]}>
          <Hero title={t('hero.title')} subtitle={t('hero.subtitle')} />

          <View style={styles.smartCard}>
            <View style={styles.smartHeader}>
              <Text style={styles.smartTitle}>{t('home.smartTitle')}</Text>
              <Text style={styles.smartSubtitle}>{t('home.smartSubtitle')}</Text>
            </View>

            {suggestionsLoading ? (
              <Text style={styles.smartStatus}>{t('home.smartLoading')}</Text>
            ) : null}

            {smartSuggestions.length > 0 ? (
              <View style={styles.smartChips}>
                {smartSuggestions.slice(0, 4).map((suggestion) => (
                  <Pressable key={suggestion} style={styles.smartChip} onPress={() => setSearch(suggestion)}>
                    <Text style={styles.smartChipText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.smartStatus}>{t('home.smartFallback')}</Text>
            )}
          </View>

          <TextInput
            style={styles.search}
            placeholder={t('search.placeholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />

          {offers.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader
                title={t('offers.title')}
                rightLabel={t('offers.discount', { value: 0 })}
              />
              {offers.map((offer) => (
                <OfferCard key={offer._id} item={offer} />
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title={t('services.title')}
              rightLabel={`${filteredServices.length} ${t('services.title').toLowerCase()}`}
            />
            {filteredServices.map((service) => (
              <ServiceCard
                key={service._id}
                item={service}
                onPress={(selected) => router.push(`/service/${selected._id}` as never)}
              />
            ))}
            {filteredServices.length === 0 ? (
              <Text style={styles.emptyText}>{t('services.noResults')}</Text>
            ) : null}
          </View>
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
  search: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
    color: AppTheme.colors.text,
    fontWeight: '600',
    marginBottom: 16,
  },
  smartCard: {
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  smartHeader: {
    gap: 4,
    marginBottom: 10,
  },
  smartTitle: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  smartSubtitle: {
    color: AppTheme.colors.mutedText,
    lineHeight: 18,
  },
  smartStatus: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  smartChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smartChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smartChipText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  section: {
    marginTop: 8,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: AppTheme.colors.mutedText,
    padding: 14,
  },
});
