// API Configuration
const isLocalBrowser =
  globalThis.window &&
  (globalThis.window.location.hostname === 'localhost' || globalThis.window.location.hostname === '127.0.0.1');

const API_BASE_URL = isLocalBrowser
  ? 'http://localhost:4000'
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  PROVIDERS: `${API_BASE_URL}/auth/providers`,
  
  // Services
  SERVICES: `${API_BASE_URL}/services`,
  SERVICE_BY_ID: (id) => `${API_BASE_URL}/services/${id}`,
  SERVICES_BY_PROVIDER: (providerId) => `${API_BASE_URL}/services?provider=${providerId}`,
  
  // Bookings
  BOOKINGS: `${API_BASE_URL}/bookings`,
  BOOKING_BY_ID: (id) => `${API_BASE_URL}/bookings/${id}`,
  MY_BOOKINGS: (clientId) => `${API_BASE_URL}/bookings?clientId=${clientId}`,
  MY_PROVIDER_BOOKINGS: (providerId) => `${API_BASE_URL}/bookings?providerId=${providerId}`,

  // Reservation Details
  RESERVATION_DETAILS: `${API_BASE_URL}/reservation-details`,
  
  // Reviews
  REVIEWS: `${API_BASE_URL}/reviews`,
  REVIEW_BY_ID: (id) => `${API_BASE_URL}/reviews/${id}`,
  SERVICE_REVIEWS: (serviceId) => `${API_BASE_URL}/reviews?service=${serviceId}`,
  
  // Offers
  OFFERS: `${API_BASE_URL}/offers`,
  ACTIVE_OFFERS: `${API_BASE_URL}/offers?active=true`,
  
  // Packages
  PACKAGES: `${API_BASE_URL}/packages`,
  PACKAGE_BY_ID: (id) => `${API_BASE_URL}/packages/${id}`,
  
  // Portfolios
  PORTFOLIOS: `${API_BASE_URL}/portfolios`,
  PROVIDER_PORTFOLIO: (providerId) => `${API_BASE_URL}/portfolios?provider=${providerId}`,
  
  // Competences
  COMPETENCES: `${API_BASE_URL}/competences`,
  PROVIDER_COMPETENCES: (providerId) => `${API_BASE_URL}/competences?provider=${providerId}`,
  
  // Availability
  AVAILABILITY: `${API_BASE_URL}/availability`,
  PROVIDER_AVAILABILITY: (providerId) => `${API_BASE_URL}/availability?provider=${providerId}`,
  
  // Notations
  NOTATIONS: `${API_BASE_URL}/notations`,
  PROVIDER_NOTATION: (providerId) => `${API_BASE_URL}/notations?provider=${providerId}`,
  
  // Transactions
  TRANSACTIONS: `${API_BASE_URL}/transactions`,
  TRANSACTION_BY_ID: (id) => `${API_BASE_URL}/transactions/${id}`,

  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATION_READ: (id) => `${API_BASE_URL}/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: `${API_BASE_URL}/notifications/read-all`,

  // Chatbot
  CHATBOT: `${API_BASE_URL}/chatbot`,
  CHATBOT_SUGGESTIONS: `${API_BASE_URL}/chatbot/suggestions`,
};

export default API_BASE_URL;
