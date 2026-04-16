import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppTheme, getResponsiveLayout } from '@/constants/theme';

export function Hero({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const responsive = getResponsiveLayout(width);

  return (
    <View style={styles.hero}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <Text style={styles.kicker}>{t('services.title')}</Text>
      <Text style={[styles.title, { fontSize: responsive.heroTitleSize, lineHeight: responsive.heroTitleLineHeight }]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  glowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(45,212,191,0.28)',
    left: -60,
    top: -45,
  },
  glowTwo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: 'rgba(251,146,60,0.24)',
    right: -80,
    bottom: -100,
  },
  kicker: {
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: AppTheme.colors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 10,
  },
  subtitle: {
    marginTop: 8,
    color: '#dbeafe',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
