import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppTheme } from '@/constants/theme';
import type { ServiceItem } from '@/data/mockData';

export function ServiceCard({
  item,
  onPress,
}: {
  item: ServiceItem;
  onPress?: (service: ServiceItem) => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(item)}>
      <View style={styles.categoryPill}>
        <Text style={styles.categoryText}>{t(`services.categories.${item.category}`)}</Text>
      </View>

      <Text style={styles.title}>{t(item.name, { defaultValue: item.name })}</Text>
      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{item.priceMin} {item.currency}</Text>
          <Text style={styles.meta}>{t('service.minutes', { count: item.duration })}</Text>
        </View>
        <View style={styles.actionBadge}>
          <Text style={styles.actionText}>{t('services.viewDetails')}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: AppTheme.colors.card,
    padding: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.md,
    ...AppTheme.shadow.card,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(15,118,110,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  categoryText: {
    color: AppTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: AppTheme.colors.mutedText,
    lineHeight: 20,
    marginBottom: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    color: AppTheme.colors.primary,
    fontWeight: '900',
    fontSize: 17,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionBadge: {
    backgroundColor: AppTheme.colors.dark,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    color: AppTheme.colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
