import { StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

export function SectionHeader({
  title,
  rightLabel,
}: {
  title: string;
  rightLabel?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {rightLabel ? (
        <View style={styles.rightPill}>
          <Text style={styles.rightPillText}>{rightLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: AppTheme.colors.text,
    flexShrink: 1,
  },
  rightPill: {
    backgroundColor: 'rgba(15,118,110,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rightPillText: {
    color: AppTheme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
