import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { servproDataService } from '@/services/servproDataService';
import type { TransactionItem } from '@/data/mockData';

const statusColors: Record<TransactionItem['status'], string> = {
  PENDING: '#f59e0b',
  SUCCESS: '#16a34a',
  FAILED: '#dc2626',
};

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | TransactionItem['status']>('all');

  const userType = user?.type || 'CLIENT';

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        const data = await servproDataService.getTransactions({ userType });
        if (mounted) {
          setTransactions(data);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [userType]),
  );

  const visibleTransactions = useMemo(() => {
    if (activeFilter === 'all') {
      return transactions;
    }
    return transactions.filter((item) => item.status === activeFilter);
  }, [activeFilter, transactions]);

  const filters: Array<'all' | TransactionItem['status']> = ['all', 'PENDING', 'SUCCESS', 'FAILED'];

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>{t('transactions.title')}</Text>
          <Text style={styles.subtitle}>
            {userType === 'PROVIDER' ? t('transactions.providerSubtitle') : t('transactions.subtitle')}
          </Text>
        </View>

        <View style={styles.filtersRow}>
          {filters.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter === 'all' ? t('transactions.filters.all') : t(`transactions.filters.${filter}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {visibleTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('transactions.noData')}</Text>
            <Text style={styles.emptySubtitle}>{t('transactions.noDataMessage')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleTransactions.map((item) => (
              <View key={item._id} style={styles.card}>
                <View style={styles.cardRowTop}>
                  <Text style={styles.bookingLabel}>{t(item.bookingLabel, { defaultValue: item.bookingLabel })}</Text>
                  <View style={[styles.statusPill, { backgroundColor: `${statusColors[item.status]}22` }]}>
                    <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                      {t(`transactions.filters.${item.status}`, { defaultValue: item.status })}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('transactions.amount')}</Text>
                  <Text style={styles.metaValue}>{item.amount} {item.currency}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('transactions.method')}</Text>
                  <Text style={styles.metaValue}>{t(`transactions.methods.${item.method}`, { defaultValue: item.method })}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{t('transactions.date')}</Text>
                  <Text style={styles.metaValue}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>

                {userType === 'PROVIDER' && item.status === 'SUCCESS' ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{t('transactions.providerAmount')}</Text>
                      <Text style={styles.providerAmount}>{item.providerAmount || 0} {item.currency}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>{t('transactions.payoutStatus')}</Text>
                      <Text style={styles.metaValue}>{t(`transactions.payout.${item.providerPayoutStatus || 'PENDING'}`)}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  hero: {
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: AppTheme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: AppTheme.colors.mutedText,
    lineHeight: 20,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  filterButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    ...AppTheme.shadow.card,
  },
  cardRowTop: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingLabel: {
    flex: 1,
    color: AppTheme.colors.text,
    fontWeight: '800',
    marginRight: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  metaValue: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
  },
  providerAmount: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '900',
  },
  divider: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  emptyCard: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  emptySubtitle: {
    marginTop: 6,
    color: AppTheme.colors.mutedText,
    textAlign: 'center',
  },
});