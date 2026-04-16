import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import '../styles/Invoices.css';

const InvoicesManagement = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    number: '',
    total: '',
    issuedAt: '',
    booking: '',
  });

  useEffect(() => {
    fetchInvoices();
    fetchBookings().then(bookingsArray => setBookings(bookingsArray));
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.INVOICES);
      // Backend returns { items: [...] }
      let invoicesArray = [];
      if (Array.isArray(data?.items)) {
        invoicesArray = data.items;
      } else if (Array.isArray(data)) {
        invoicesArray = data;
      }
      setInvoices(invoicesArray);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const data = await apiService.get(API_ENDPOINTS.BOOKINGS);
      // Backend returns { items: [...] }
      let bookingsArray = [];
      if (Array.isArray(data?.items)) {
        bookingsArray = data.items;
      } else if (Array.isArray(data)) {
        bookingsArray = data;
      }
      return bookingsArray;
    } catch (err) {
      console.error('Error fetching bookings:', err);
      return [];
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!formData.booking) {
      setError(t('invoices.selectBookingError'));
      setSaving(false);
      return;
    }

    try {
      const payload = {
        number: formData.number,
        total: Number(formData.total),
        booking: formData.booking,
      };

      if (formData.issuedAt) {
        payload.issuedAt = formData.issuedAt;
      }

      await apiService.post(API_ENDPOINTS.INVOICES, payload);
      setFormData({ number: '', total: '', issuedAt: '', booking: '' });
      setShowCreateModal(false);
      fetchInvoices();
    } catch (err) {
      setError(err.message || t('invoices.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!isAdmin) {
      globalThis.alert(t('invoices.deleteError'));
      return;
    }

    if (!globalThis.confirm(t('invoices.deleteConfirm'))) {
      return;
    }
    try {
      await apiService.delete(API_ENDPOINTS.INVOICE_BY_ID(invoiceId));
      fetchInvoices();
    } catch (err) {
      globalThis.alert(`${t('invoices.deleteError')}: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  const getInvoiceServiceLabel = (invoice) => {
    if (!invoice.booking) {
      return `⚠️ ${t('invoices.missingBooking')}`;
    }

    if (invoice.booking.service?.name) {
      return t(invoice.booking.service.name);
    }

    return t('invoices.unknownService');
  };

  return (
    <div className="invoices-management">
      <div className="page-header">
        <h1>{t('invoices.title')}</h1>
        {isAdmin && (
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
            aria-label={t('invoices.new')}
            title={t('invoices.new')}
          >
            +
          </button>
        )}
      </div>

      <div className="invoices-table">
        <table>
          <thead>
            <tr>
              <th>{t('invoices.table.number')}</th>
              <th>{t('invoices.table.client')}</th>
              <th>{t('invoices.table.service')}</th>
              <th>{t('invoices.table.amount')}</th>
              <th>{t('invoices.table.issuedAt')}</th>
              <th>{t('invoices.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice._id}>
                <td>{invoice.number || invoice._id.substring(0, 8)}</td>
                <td>{invoice.booking ? (invoice.booking.client?.name || t('invoices.unknownClient')) : `⚠️ ${t('invoices.missingBooking')}`}</td>
                <td>{getInvoiceServiceLabel(invoice)}</td>
                <td>{invoice.total} TND</td>
                <td>{new Date(invoice.issuedAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button className="btn-view" aria-label={t('invoices.view')} title={t('invoices.view')}>👁</button>
                  <button className="btn-download" aria-label={t('invoices.download')} title={t('invoices.download')}>⬇</button>
                  {isAdmin && (
                    <button className="btn-delete" onClick={() => handleDeleteInvoice(invoice._id)} aria-label={t('invoices.delete')} title={t('invoices.delete')}>
                      🗑
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <p className="no-data">{t('invoices.noData')}</p>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t('invoices.modalTitle')}</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form className="modal-body" onSubmit={handleCreateInvoice}>
              <div className="form-group">
                <label htmlFor="number">{t('invoices.number')} *</label>
                <input
                  id="number"
                  name="number"
                  type="text"
                  value={formData.number}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="total">{t('invoices.amount')} *</label>
                <input
                  id="total"
                  name="total"
                  type="number"
                  value={formData.total}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="booking">{t('invoices.booking')} *</label>
                <select
                  id="booking"
                  name="booking"
                  value={formData.booking}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('invoices.selectBooking')}</option>
                  {bookings.map(booking => (
                    <option key={booking._id} value={booking._id}>
                      {booking.client?.name || t('invoices.unknownClient')} - {booking.service?.name ? t(booking.service.name) : t('invoices.unknownService')} ({booking._id.substring(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="issuedAt">{t('invoices.issuedAt')}</label>
                <input
                  id="issuedAt"
                  name="issuedAt"
                  type="date"
                  value={formData.issuedAt}
                  onChange={handleChange}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} aria-label={t('buttons.cancel')} title={t('buttons.cancel')}>
                  ✕
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  aria-label={saving ? t('invoices.creating') : t('invoices.create')}
                  title={saving ? t('invoices.creating') : t('invoices.create')}
                >
                  {saving ? '⏳' : '💾'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesManagement;
