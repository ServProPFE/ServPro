import Constants from 'expo-constants';
import { Platform } from 'react-native';

const normalizeBaseUrl = (value?: string) => (value || '').trim().replace(/\/+$/, '');

const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const renderFallbackBaseUrl = 'https://servpro-backend.onrender.com';

const localhostByPlatform = Platform.select({
  android: 'http://10.0.2.2:4000',
  default: 'http://localhost:4000',
});

const extraBaseUrl = normalizeBaseUrl(
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl,
);

const resolveExpoHost = (): string => {
  const constantsAny = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    manifest?: { debuggerHost?: string };
  };

  const candidates = [
    constantsAny.expoConfig?.hostUri,
    constantsAny.expoGoConfig?.debuggerHost,
    constantsAny.manifest2?.extra?.expoGo?.debuggerHost,
    constantsAny.manifest?.debuggerHost,
  ];

  const raw = candidates.find((value) => typeof value === 'string' && value.length > 0);
  if (!raw) {
    return '';
  }

  // Example values: 192.168.1.12:8081 or exp://192.168.1.12:8081
  const normalized = raw.replace(/^.*?:\/\//, '');
  const host = normalized.split(':')[0]?.trim();
  return host || '';
};

const lanHost = resolveExpoHost();
const lanBaseUrl = lanHost ? `http://${lanHost}:4000` : '';

export const API_BASE_URL =
  envBaseUrl ||
  extraBaseUrl ||
  renderFallbackBaseUrl ||
  lanBaseUrl ||
  localhostByPlatform ||
  'http://localhost:4000';

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  PROVIDERS: `${API_BASE_URL}/auth/providers`,
  SERVICES: `${API_BASE_URL}/services`,
  SERVICES_BY_PROVIDER: (providerId: string) => `${API_BASE_URL}/services?providerId=${providerId}`,
  ACTIVE_OFFERS: `${API_BASE_URL}/offers?active=true`,
  BOOKINGS: `${API_BASE_URL}/bookings`,
  BOOKING_BY_ID: (id: string) => `${API_BASE_URL}/bookings/${id}`,
  TRANSACTIONS: `${API_BASE_URL}/transactions`,
  TRANSACTION_BY_ID: (id: string) => `${API_BASE_URL}/transactions/${id}`,
  RESERVATION_DETAILS: `${API_BASE_URL}/reservation-details`,
  PORTFOLIOS: `${API_BASE_URL}/portfolios`,
  PORTFOLIOS_BY_PROVIDER: (providerId: string) => `${API_BASE_URL}/portfolios?providerId=${providerId}`,
  AVAILABILITY_BY_PROVIDER: (providerId: string) => `${API_BASE_URL}/availability?providerId=${providerId}`,
  CHATBOT: `${API_BASE_URL}/chatbot`,
  CHATBOT_SUGGESTIONS: `${API_BASE_URL}/chatbot/suggestions`,
};
