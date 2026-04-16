import { StyleSheet, View } from 'react-native';

import { AppTheme } from '@/constants/theme';

export function AppBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.screen}>
      <View style={styles.blobLeft} />
      <View style={styles.blobRight} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  blobLeft: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    left: -80,
    top: 30,
    backgroundColor: 'rgba(20,184,166,0.18)',
  },
  blobRight: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
    right: -90,
    top: -30,
    backgroundColor: 'rgba(251,146,60,0.2)',
  },
});
