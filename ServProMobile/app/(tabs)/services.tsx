import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

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

  // Debounced semantic search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      setIsSearching(false);
      loadServices();
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await servproDataService.semanticSearch(searchTerm.trim());
        setServices(results);
      } catch (error) {
        console.error('Semantic search error:', error);
        loadServices();
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, loadServices]);

  const filtered = useMemo(() => {
    return services.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchesCategory;
    });
  }, [selectedCategory, services]);

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
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.search}
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#94a3b8"
              editable={!isSearching}
            />
            {isSearching && <Text style={styles.searchingIndicator}>...</Text>}
          </View>
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
          {filtered.length === 0 && !isSearching ? (
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
  searchContainer: {
    position: 'relative',
    marginTop: 10,
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
  },
  searchingIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  filters: {
    marginTop: 10,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  filterButtonActive: {
    borderColor: AppTheme.colors.primary,
    backgroundColor: AppTheme.colors.primary,
  },
  filterText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 12,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  section: {
    marginTop: 16,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
    fontSize: 14,
  },
});
