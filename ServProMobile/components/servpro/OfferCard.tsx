import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppTheme } from '@/constants/theme';
import type { OfferItem } from '@/data/mockData';

export function OfferCard({ item }: { item: OfferItem }) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>-{item.discount}%</Text>
      </View>
      <Text style={styles.title}>{t(item.title, { defaultValue: item.title })}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.meta}>{t('offers.validUntil', { date: new Date(item.validUntil).toLocaleDateString() })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    padding: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.md,
    ...AppTheme.shadow.card,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: AppTheme.colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    color: AppTheme.colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  title: {
    color: AppTheme.colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  description: {
    marginTop: 6,
    color: AppTheme.colors.mutedText,
    lineHeight: 20,
  },
  meta: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
