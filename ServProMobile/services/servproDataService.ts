import { API_ENDPOINTS } from '@/services/apiConfig';
import { apiService } from '@/services/apiService';
import {
  mockOffers,
  mockServices,
  mockTransactions,
  type BookingItem,
  type OfferItem,
  type ServiceItem,
  type TransactionItem,
} from '@/data/mockData';

type ApiItems<T> = { items?: T[] } | T[];
let localBookings: BookingItem[] = [];
let localServices: ServiceItem[] = [];
let localTransactions: TransactionItem[] = [];

type BookingApiItem = Partial<BookingItem> & {
  _id?: string;
  id?: string;
  expectedAt?: string;
  scheduledAt?: string;
  totalPrice?: number;
  amount?: number;
  currency?: string;
  status?: string;
  serviceName?: string;
  providerName?: string;
  service?: { name?: string } | string;
  provider?: { name?: string } | string;
};

type CreateBookingInput = {
  serviceId: string;
  providerId?: string;
  serviceName: string;
  providerName?: string;
  scheduledAt: string;
  address: string;
  notes?: string;
  amount: number;
  currency: string;
  clientId?: string;
};

type GetTransactionsInput = {
  userType?: 'CLIENT' | 'PROVIDER' | 'ADMIN';
};

type TransactionApiItem = Partial<TransactionItem> & {
  _id?: string;
  id?: string;
  booking?: {
    service?: { name?: string };
    provider?: { name?: string };
  };
  createdAt?: string;
  providerAmount?: number;
  providerPayoutStatus?: 'PENDING' | 'PAID';
};

const parseApiErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Failed to create booking';
};

type GetBookingsInput = {
  clientId?: string;
  providerId?: string;
};

const normalizeItems = <T,>(payload: ApiItems<T>): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
};

const mergeBookings = (primary: BookingItem[], secondary: BookingItem[]): BookingItem[] => {
  const merged = new Map<string, BookingItem>();

  for (const booking of primary) {
    merged.set(booking._id, booking);
  }
  for (const booking of secondary) {
    if (!merged.has(booking._id)) {
      merged.set(booking._id, booking);
    }
  }

  return Array.from(merged.values());
};

const isLocalBooking = (booking: BookingItem) => booking._id.startsWith('local-');

const withBookingQuery = (input?: GetBookingsInput) => {
  if (!input?.clientId && !input?.providerId) {
    return API_ENDPOINTS.BOOKINGS;
  }

  const params = new URLSearchParams();
  if (input.clientId) {
    params.set('clientId', input.clientId);
  }
  if (input.providerId) {
    params.set('providerId', input.providerId);
  }

  return `${API_ENDPOINTS.BOOKINGS}?${params.toString()}`;
};

const normalizeBooking = (item: BookingApiItem): BookingItem => {
  const normalizedStatus = item.status === 'COMPLETED' ? 'DONE' : item.status;
  const serviceName =
    item.serviceName ||
    (typeof item.service === 'object' && item.service?.name ? item.service.name : undefined) ||
    (typeof item.service === 'string' ? item.service : undefined) ||
    'services.title';
  const providerName =
    item.providerName ||
    (typeof item.provider === 'object' && item.provider?.name ? item.provider.name : undefined) ||
    (typeof item.provider === 'string' ? item.provider : undefined) ||
    'ServPro Provider';

  return {
    _id: item._id || item.id || `booking-${Date.now()}`,
    serviceName,
    providerName,
    scheduledAt: item.scheduledAt || item.expectedAt || '',
    status: (normalizedStatus as BookingItem['status']) || 'PENDING',
    amount: Number(item.amount ?? item.totalPrice ?? 0),
    currency: item.currency || 'TND',
  };
};

const normalizeTransaction = (item: TransactionApiItem): TransactionItem => {
  const serviceName = item.booking?.service?.name || 'services.title';
  const providerName = item.booking?.provider?.name || 'ServPro Provider';

  return {
    _id: item._id || item.id || `tx-${Date.now()}`,
    amount: Number(item.amount ?? 0),
    currency: item.currency || 'TND',
    method: (item.method as TransactionItem['method']) || 'CASH',
    status: (item.status as TransactionItem['status']) || 'PENDING',
    createdAt: item.createdAt || new Date().toISOString(),
    bookingLabel: `${serviceName} - ${providerName}`,
    providerAmount: Number(item.providerAmount ?? 0),
    providerPayoutStatus: item.providerPayoutStatus || 'PENDING',
  };
};

const canCreateBackendBooking = (input: CreateBookingInput) => {
  return !!(input.clientId && input.providerId && input.serviceId && input.scheduledAt && input.address);
};

export const servproDataService = {
  async getServices(): Promise<ServiceItem[]> {
    try {
      const data = await apiService.get<ApiItems<ServiceItem>>(API_ENDPOINTS.SERVICES);
      const items = normalizeItems(data);
      if (items.length) {
        localServices = items;
        return localServices;
      }
      return localServices.length ? localServices : mockServices;
    } catch {
      return localServices.length ? localServices : mockServices;
    }
  },

  async getOffers(): Promise<OfferItem[]> {
    try {
      const data = await apiService.get<ApiItems<OfferItem>>(API_ENDPOINTS.ACTIVE_OFFERS);
      const items = normalizeItems(data);
      return items.length ? items : mockOffers;
    } catch {
      return mockOffers;
    }
  },

  async getBookings(input?: GetBookingsInput): Promise<BookingItem[]> {
    try {
      const data = await apiService.get<ApiItems<BookingApiItem>>(withBookingQuery(input));
      const items = normalizeItems(data);
      const normalized = items.map(normalizeBooking);
      const optimisticOnly = localBookings.filter(isLocalBooking);
      localBookings = mergeBookings(normalized, optimisticOnly);
      return localBookings;
    } catch {
      return localBookings;
    }
  },

  async createBooking(input: CreateBookingInput): Promise<BookingItem> {
    if (!canCreateBackendBooking(input)) {
      throw new Error('Missing required booking data');
    }

    try {
      const detail = await apiService.post<{ _id: string }>(API_ENDPOINTS.RESERVATION_DETAILS, {
        description: input.notes,
        address: input.address,
        urgent: false,
      });

      const created = await apiService.post<BookingApiItem>(API_ENDPOINTS.BOOKINGS, {
        client: input.clientId,
        provider: input.providerId,
        service: input.serviceId,
        expectedAt: input.scheduledAt,
        status: 'PENDING',
        detail: detail._id,
      });

      const normalized = normalizeBooking({
        ...created,
        serviceName: created.serviceName || input.serviceName,
        providerName: created.providerName || input.providerName || 'ServPro Provider',
        scheduledAt: created.scheduledAt || created.expectedAt || input.scheduledAt,
        amount: created.amount ?? created.totalPrice ?? input.amount,
        currency: created.currency || input.currency,
      });
      localBookings = [normalized, ...localBookings];
      return normalized;
    } catch (error) {
      throw new Error(parseApiErrorMessage(error));
    }
  },

  async getTransactions(input?: GetTransactionsInput): Promise<TransactionItem[]> {
    try {
      const data = await apiService.get<ApiItems<TransactionApiItem>>(API_ENDPOINTS.TRANSACTIONS);
      const items = normalizeItems(data).map(normalizeTransaction);

      if (input?.userType === 'PROVIDER') {
        localTransactions = items.filter((item) => item.status === 'SUCCESS' || item.providerPayoutStatus === 'PENDING');
      } else {
        localTransactions = items;
      }

      return localTransactions;
    } catch {
      return localTransactions.length ? localTransactions : mockTransactions;
    }
  },
};
