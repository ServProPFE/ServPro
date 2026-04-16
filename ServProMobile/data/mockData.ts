export type ServiceCategory = 'PLOMBERIE' | 'ELECTRICITE' | 'CLIMATISATION' | 'NETTOYAGE' | 'AUTRE';

export type ServiceItem = {
  _id: string;
  provider?: string | { _id?: string; name?: string };
  name: string;
  category: ServiceCategory;
  description: string;
  priceMin: number;
  currency: string;
  duration: number;
};

export type OfferItem = {
  _id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
};

export type BookingItem = {
  _id: string;
  serviceName: string;
  providerName: string;
  scheduledAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'COMPLETED';
  amount: number;
  currency: string;
};

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type TransactionItem = {
  _id: string;
  amount: number;
  currency: string;
  method: 'CARD' | 'KNET' | 'APPLE_PAY' | 'GOOGLE_PAY' | 'PAYPAL' | 'CASH';
  status: TransactionStatus;
  createdAt: string;
  bookingLabel: string;
  providerAmount?: number;
  providerPayoutStatus?: 'PENDING' | 'PAID';
};

export const mockServices: ServiceItem[] = [
  {
    _id: 's1',
    name: 'serviceNames.waterLeakRepair',
    category: 'PLOMBERIE',
    description: 'Rapid and reliable plumbing support for leaks, faucets, and urgent repairs.',
    priceMin: 45,
    currency: 'TND',
    duration: 60,
  },
  {
    _id: 's2',
    name: 'serviceNames.electricalInstallation',
    category: 'ELECTRICITE',
    description: 'Safe electrical diagnostics, wiring updates, and installation services.',
    priceMin: 55,
    currency: 'TND',
    duration: 75,
  },
  {
    _id: 's3',
    name: 'serviceNames.acMaintenance',
    category: 'CLIMATISATION',
    description: 'Maintenance and optimization for AC systems to keep your home efficient.',
    priceMin: 65,
    currency: 'TND',
    duration: 90,
  },
  {
    _id: 's4',
    name: 'serviceNames.apartmentCleaning',
    category: 'NETTOYAGE',
    description: 'Professional deep-clean package for kitchens, living spaces, and offices.',
    priceMin: 40,
    currency: 'TND',
    duration: 120,
  },
];

export const mockOffers: OfferItem[] = [
  {
    _id: 'o1',
    title: 'offerTitles.springCleaning',
    description: 'Book any service this week and get premium support priority.',
    discount: 20,
    validUntil: '2026-05-30T00:00:00.000Z',
  },
  {
    _id: 'o2',
    title: 'offerTitles.acOffer',
    description: 'New clients receive a discounted first intervention from top providers.',
    discount: 15,
    validUntil: '2026-06-15T00:00:00.000Z',
  },
];

export const mockBookings: BookingItem[] = [
  {
    _id: 'b1',
    serviceName: 'serviceNames.waterLeakRepair',
    providerName: 'Ahmed Ben Salah',
    scheduledAt: '2026-04-10T09:30:00.000Z',
    status: 'CONFIRMED',
    amount: 45,
    currency: 'TND',
  },
  {
    _id: 'b2',
    serviceName: 'serviceNames.apartmentCleaning',
    providerName: 'Nour Service Team',
    scheduledAt: '2026-04-15T14:00:00.000Z',
    status: 'PENDING',
    amount: 40,
    currency: 'TND',
  },
];

export const mockTransactions: TransactionItem[] = [
  {
    _id: 'tx1',
    amount: 70,
    currency: 'TND',
    method: 'CARD',
    status: 'SUCCESS',
    createdAt: '2026-04-05T10:20:00.000Z',
    bookingLabel: 'serviceNames.apartmentCleaning - Amira Nettoyage',
    providerAmount: 63,
    providerPayoutStatus: 'PAID',
  },
  {
    _id: 'tx2',
    amount: 50,
    currency: 'TND',
    method: 'CASH',
    status: 'PENDING',
    createdAt: '2026-04-06T14:10:00.000Z',
    bookingLabel: 'serviceNames.windowCleaning - Amira Nettoyage',
    providerAmount: 0,
    providerPayoutStatus: 'PENDING',
  },
];
