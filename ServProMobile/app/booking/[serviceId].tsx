import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { API_ENDPOINTS } from '@/services/apiConfig';
import { apiService } from '@/services/apiService';
import type { ServiceItem } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { servproDataService } from '@/services/servproDataService';

type ProviderApiItem = {
  _id?: string;
  id?: string;
  name?: string;
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeInput = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const parseScheduledAt = (datePart: string, timePart: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !/^\d{2}:\d{2}$/.test(timePart)) {
    return null;
  }

  const parsed = new Date(`${datePart}T${timePart}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const toRefId = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const id = (value as { _id?: unknown })._id;
    return typeof id === 'string' ? id : undefined;
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
};

export default function BookingScreen() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { serviceId } = useLocalSearchParams<{ serviceId: string | string[] }>();

  const initialDate = new Date(Date.now() + 60 * 60 * 1000);
  const normalizedServiceId = Array.isArray(serviceId) ? serviceId[0] : serviceId;

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [providers, setProviders] = useState<ProviderApiItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [bookingDate, setBookingDate] = useState(toDateInput(initialDate));
  const [bookingTime, setBookingTime] = useState(toTimeInput(initialDate));
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoadingServices(true);
      try {
        const [all, providersData] = await Promise.all([
          servproDataService.getServices(),
          apiService.get<{ items?: ProviderApiItem[] } | ProviderApiItem[]>(API_ENDPOINTS.PROVIDERS),
        ]);

        setServices(all);
        setProviders(Array.isArray(providersData) ? providersData : providersData.items || []);
      } finally {
        setIsLoadingServices(false);
      }
    })();
  }, []);

  const service = useMemo(
    () => services.find((item) => item._id === normalizedServiceId),
    [services, normalizedServiceId],
  );
  const providerName = useMemo(() => {
    if (!service?.provider) return '';
    if (typeof service.provider === 'string') {
      return providers.find((provider) => provider._id === service.provider || provider.id === service.provider)?.name || '';
    }
    return service.provider.name || '';
  }, [providers, service?.provider]);
  const providerId = toRefId(service?.provider);
  const clientId = user?._id ?? user?.id;

  const isClient = user?.type === 'CLIENT';

  const onSubmit = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login' as never);
      return;
    }

    if (!isClient) {
      Alert.alert(t('booking.error'), t('service.onlyClients'));
      return;
    }

    if (!service) {
      Alert.alert(t('booking.error'), t('service.notFound'));
      return;
    }

    if (!providerId) {
      Alert.alert(t('booking.error'), t('booking.error'));
      return;
    }

    if (!address.trim()) {
      Alert.alert(t('booking.error'), t('booking.addressPlaceholder'));
      return;
    }

    const scheduledDate = parseScheduledAt(bookingDate, bookingTime);
    if (!scheduledDate) {
      Alert.alert(t('booking.error'), t('booking.dateTime'));
      return;
    }

    if (scheduledDate.getTime() < Date.now()) {
      Alert.alert(t('booking.error'), t('booking.dateTime'));
      return;
    }

    setSubmitting(true);
    try {
      await servproDataService.createBooking({
        serviceId: service._id,
        providerId,
        serviceName: service.name,
        providerName: providerName || t('providers.fallbackName', { defaultValue: 'Provider' }),
        scheduledAt: scheduledDate.toISOString(),
        address: address.trim(),
        notes: notes.trim(),
        amount: service.priceMin,
        currency: service.currency,
        clientId,
      });

      Alert.alert(t('common.save'), t('booking.success'));
      router.replace('/(tabs)/bookings' as never);
    } catch (error) {
      Alert.alert(t('booking.error'), error instanceof Error ? error.message : t('booking.error'));
    } finally {
      setSubmitting(false);
    }
  };

  let content = null;

  if (isLoadingServices) {
    content = (
      <View style={styles.card}>
        <Text style={styles.subtitle}>{t('common.loading')}</Text>
      </View>
    );
  } else if (service) {
    content = (
      <View style={styles.card}>
        <Text style={styles.title}>{t('booking.title', { name: t(service.name, { defaultValue: service.name }) })}</Text>
        <Text style={styles.subtitle}>{t('services.descriptionFallback')}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>{t('booking.totalPrice')}</Text>
          <Text style={styles.priceValue}>{service.priceMin} {service.currency}</Text>
        </View>

        <Text style={styles.label}>{t('booking.dateTime')}</Text>
        <View style={styles.dateTimeRow}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={bookingDate}
            onChangeText={setBookingDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={bookingTime}
            onChangeText={setBookingTime}
            placeholder="HH:mm"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <Text style={styles.label}>{t('booking.address')}</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder={t('booking.addressPlaceholder')}
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>{t('booking.notes')}</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('booking.notesPlaceholder')}
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Pressable style={styles.confirmBtn} onPress={onSubmit} disabled={submitting}>
          <Text style={styles.confirmBtnText}>{submitting ? t('booking.booking') : t('booking.confirm')}</Text>
        </Pressable>
      </View>
    );
  } else if (!isLoadingServices) {
    content = <Text style={styles.notFound}>{t('service.notFound')}</Text>;
  }

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content}>
        {content}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
    ...AppTheme.shadow.card,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: AppTheme.colors.mutedText,
    lineHeight: 20,
  },
  priceRow: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: '#64748b',
    fontWeight: '700',
  },
  priceValue: {
    color: AppTheme.colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    color: AppTheme.colors.text,
    fontWeight: '800',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    color: AppTheme.colors.text,
    paddingHorizontal: 12,
    height: 44,
    fontWeight: '600',
  },
  halfInput: {
    flex: 1,
  },
  textarea: {
    height: 96,
    paddingTop: 10,
  },
  confirmBtn: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  notFound: {
    marginTop: 30,
    textAlign: 'center',
    color: AppTheme.colors.mutedText,
  },
});
