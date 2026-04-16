// API Configuration for Dashboard
const isLocalBrowser =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = isLocalBrowser
  ? 'http://localhost:4000'
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  
  // Services Management
  SERVICES: `${API_BASE_URL}/services`,
  SERVICE_BY_ID: (id) => `${API_BASE_URL}/services/${id}`,
  
  // Bookings Management
  BOOKINGS: `${API_BASE_URL}/bookings`,
  BOOKING_BY_ID: (id) => `${API_BASE_URL}/bookings/${id}`,
  
  // Reviews Management
  REVIEWS: `${API_BASE_URL}/reviews`,
  REVIEW_BY_ID: (id) => `${API_BASE_URL}/reviews/${id}`,
  
  // Offers Management
  OFFERS: `${API_BASE_URL}/offers`,
  OFFER_BY_ID: (id) => `${API_BASE_URL}/offers/${id}`,
  
  // Packages Management
  PACKAGES: `${API_BASE_URL}/packages`,
  PACKAGE_BY_ID: (id) => `${API_BASE_URL}/packages/${id}`,
  
  // Invoices
  INVOICES: `${API_BASE_URL}/invoices`,
  INVOICE_BY_ID: (id) => `${API_BASE_URL}/invoices/${id}`,
  
  // Commissions
  COMMISSIONS: `${API_BASE_URL}/commissions`,
  COMMISSION_BY_ID: (id) => `${API_BASE_URL}/commissions/${id}`,
  
  // Portfolios
  PORTFOLIOS: `${API_BASE_URL}/portfolios`,
  PORTFOLIO_BY_ID: (id) => `${API_BASE_URL}/portfolios/${id}`,
  
  // Competences
  COMPETENCES: `${API_BASE_URL}/competences`,
  COMPETENCE_BY_ID: (id) => `${API_BASE_URL}/competences/${id}`,
  
  // Certifications
  CERTIFICATIONS: `${API_BASE_URL}/certifications`,
  CERTIFICATION_BY_ID: (id) => `${API_BASE_URL}/certifications/${id}`,
  
  // Availability
  AVAILABILITY: `${API_BASE_URL}/availability`,
  AVAILABILITY_BY_ID: (id) => `${API_BASE_URL}/availability/${id}`,
  
  // Notations
  NOTATIONS: `${API_BASE_URL}/notations`,
  
  // Transactions
  TRANSACTIONS: `${API_BASE_URL}/transactions`,
  TRANSACTION_BY_ID: (id) => `${API_BASE_URL}/transactions/${id}`,
  
  // Tracking
  TRACKING: `${API_BASE_URL}/tracking`,
  TRACKING_BY_ID: (id) => `${API_BASE_URL}/tracking/${id}`,
};

export default API_BASE_URL;
