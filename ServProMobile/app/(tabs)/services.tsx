import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { SectionHeader } from '@/components/servpro/SectionHeader';
import { ServiceCard } from '@/components/servpro/ServiceCard';
import { AppTheme, getResponsiveLayout } from '@/constants/theme';
import type { ServiceCategory, ServiceItem } from '@/data/mockData';
import { servproDataService } from '@/services/servproDataService';

const categories: (ServiceCategory | 'ALL')[] = [
  'ALL',
  'PLOMBERIE',
  'ELECTRICITE',
  'CLIMATISATION',
  'NETTOYAGE',
  'AUTRE',
];

export default function ServicesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const responsive = getResponsiveLayout(width);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'ALL'>('ALL');

  const loadServices = useCallback(async () => {
    const data = await servproDataService.getServices();
    setServices(data);
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [loadServices]),
  );

  const filtered = useMemo(() => {
    return services.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() || item.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, services]);

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: responsive.horizontalPadding }]}>
        <View style={[styles.contentWrap, { maxWidth: responsive.contentMaxWidth }]}> 
        <View style={styles.headCard}>
          <SectionHeader title={t('services.allTitle')} rightLabel={`${filtered.length} ${t('services.title').toLowerCase()}`} />
          <Pressable
            style={styles.providerBtn}
            onPress={() => router.push('/providers' as never)}>
            <Text style={styles.providerBtnText}>{t('providers.openDirectory')}</Text>
          </Pressable>
          <TextInput
            style={styles.search}
            placeholder={t('search.placeholder')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[styles.filterButton, selectedCategory === category && styles.filterButtonActive]}>
                <Text
                  style={[
                    styles.filterText,
                    selectedCategory === category && styles.filterTextActive,
                  ]}>
                  {t(`services.categories.${category}`)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          {filtered.map((service) => (
            <ServiceCard
              key={service._id}
              item={service}
              onPress={(selected) => router.push(`/service/${selected._id}` as never)}
            />
          ))}
          {filtered.length === 0 ? (
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
    paddingBottom: 22,
  },
  contentWrap: {
    width: '100%',
    alignSelf: 'center',
  },
  headCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: AppTheme.radius.xl,
    backgroundColor: '#ffffff',
    padding: 14,
    ...AppTheme.shadow.card,
  },
  search: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 12,
    color: AppTheme.colors.text,
    fontWeight: '600',
    marginTop: 10,
  },
  providerBtn: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0f172a',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  providerBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  filters: {
    gap: 8,
    marginTop: 12,
  },
  filterButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
  },
  filterButtonActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  filterText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  section: {
    marginTop: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: AppTheme.colors.mutedText,
    paddingVertical: 16,
  },
});
