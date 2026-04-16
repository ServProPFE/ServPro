import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const homeTabIcon = ({ color }: { color: string }) => <Ionicons size={20} name="home" color={color} />;
const servicesTabIcon = ({ color }: { color: string }) => <Ionicons size={20} name="grid" color={color} />;
const bookingsTabIcon = ({ color }: { color: string }) => <Ionicons size={20} name="calendar" color={color} />;
const transactionsTabIcon = ({ color }: { color: string }) => <Ionicons size={20} name="wallet" color={color} />;
const chatbotTabIcon = ({ color }: { color: string }) => <Ionicons size={20} name="chatbubble-ellipses" color={color} />;
const profileTabIcon = ({ color }: { color: string }) => <Ionicons size={20} name="person" color={color} />;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isTablet = width >= 768;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          height: (isTablet ? 72 : 62) + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: isTablet ? 8 : 6,
          borderTopColor: '#e2e8f0',
          backgroundColor: '#ffffff',
        },
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: isCompact ? 11 : 12,
        },
        tabBarItemStyle: {
          maxWidth: isTablet ? 132 : undefined,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: homeTabIcon,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t('nav.services'),
          tabBarIcon: servicesTabIcon,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('nav.myBookings'),
          tabBarIcon: bookingsTabIcon,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('nav.myTransactions'),
          tabBarIcon: transactionsTabIcon,
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: t('chatbot.title'),
          tabBarIcon: chatbotTabIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('mobile.profile', { defaultValue: 'Profile' }),
          tabBarIcon: profileTabIcon,
        }}
      />
    </Tabs>
  );
}
