import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { Hero } from '@/components/servpro/Hero';
import { OfferCard } from '@/components/servpro/OfferCard';
import { SectionHeader } from '@/components/servpro/SectionHeader';
import { ServiceCard } from '@/components/servpro/ServiceCard';
import { AppTheme, getResponsiveLayout } from '@/constants/theme';
import { servproDataService } from '@/services/servproDataService';
import type { OfferItem, ServiceItem } from '@/data/mockData';

export default function HomeScreen() {
  const { t } = useTranslation();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const responsive = getResponsiveLayout(width);

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

  const filteredServices = useMemo(() => {
    if (!search.trim()) {
      return services;
    }
    return services.filter((service) =>
      t(service.name, { defaultValue: service.name }).toLowerCase().includes(search.trim().toLowerCase()),
    );
  }, [search, services, t]);

  return (
    <AppBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: responsive.horizontalPadding }]}
      >
        <View style={[styles.contentWrap, { maxWidth: responsive.contentMaxWidth }]}>
          <Hero title={t('hero.title')} subtitle={t('hero.subtitle')} />

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
