import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '@/i18n';
import { useTranslation } from 'react-i18next';

import { AuthProvider } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ title: t('auth.loginTitle') }} />
          <Stack.Screen name="auth/register" options={{ title: t('auth.registerTitle') }} />
          <Stack.Screen name="booking/[serviceId]" options={{ title: t('booking.bookNow') }} />
          <Stack.Screen name="service/[id]" options={{ title: t('services.viewDetails') }} />
          <Stack.Screen name="providers/index" options={{ title: t('providers.title') }} />
          <Stack.Screen name="providers/[providerId]" options={{ title: t('providers.portfolioTitle') }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
