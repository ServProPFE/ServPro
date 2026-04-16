import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import '../styles/Transactions.css';

const TransactionsManagement = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const statuses = ['ALL', 'PENDING', 'SUCCESS', 'FAILED'];

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.TRANSACTIONS);
      let transactionsArray = [];
      if (Array.isArray(data?.items)) {
        transactionsArray = data.items;
      } else if (Array.isArray(data)) {
        transactionsArray = data;
      }
      setTransactions(transactionsArray);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (transactionId, newStatus) => {
    if (!isAdmin) return;
    
    try {
      await apiService.put(API_ENDPOINTS.TRANSACTION_BY_ID(transactionId), {
        status: newStatus,
      });
      fetchTransactions();
    } catch (err) {
      alert(t('common.error', { message: err.message }));
    }
  };

  const handleDelete = async (transactionId) => {
    if (!isAdmin) return;
    
    if (!globalThis.confirm(t('transactions.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(API_ENDPOINTS.TRANSACTION_BY_ID(transactionId));
      fetchTransactions();
    } catch (err) {
      alert(t('common.error', { message: err.message }));
    }
  };

  const filteredTransactions = filter === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.status === filter);

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="transactions-management">
      <div className="page-header">
        <h1>{t('transactions.title')}</h1>
      </div>

      <div className="status-filters">
        {statuses.map(status => (
          <button
            key={status}
            className={`filter-btn ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'ALL' ? t('transactions.filters.all') : t(`transactions.filters.${status}`)}
            <span className="count">
              {status === 'ALL'
                ? transactions.length
                : transactions.filter(t => t.status === status).length}
            </span>
          </button>
        ))}
      </div>

      <div className="transactions-table">
        <table>
          <thead>
            <tr>
              <th>{t('transactions.table.id')}</th>
              <th>{t('transactions.table.booking')}</th>
              <th>{t('transactions.table.amount')}</th>
              <th>{t('transactions.table.method')}</th>
              <th>{t('transactions.table.status')}</th>
              <th>{t('transactions.table.date')}</th>
              {isAdmin && <th>{t('transactions.table.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(transaction => (
              <tr key={transaction._id}>
                <td>{transaction._id.substring(0, 8)}...</td>
                <td>
                  {transaction.booking ? (
                    <span>
                      {transaction.booking.service?.name ? t(transaction.booking.service.name) : 'Service'} - {transaction.booking.provider?.name || 'Provider'}
                    </span>
                  ) : 'N/A'}
                </td>
                <td>{transaction.amount} {transaction.currency}</td>
                <td>
                  <span className={`method-badge ${transaction.method}`}>
                    {transaction.method}
                  </span>
                </td>
                <td>
                  {isAdmin ? (
                    <select
                      value={transaction.status}
                      onChange={(e) => handleStatusUpdate(transaction._id, e.target.value)}
                      className={`status-select ${transaction.status}`}
                    >
                      <option value="PENDING">{t('transactions.filters.PENDING')}</option>
                      <option value="SUCCESS">{t('transactions.filters.SUCCESS')}</option>
                      <option value="FAILED">{t('transactions.filters.FAILED')}</option>
                    </select>
                  ) : (
                    <span className={`status-badge ${transaction.status}`}>
                      {t(`transactions.filters.${transaction.status}`)}
                    </span>
                  )}
                </td>
                <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                {isAdmin && (
                  <td className="actions">
                    <button
                      onClick={() => handleDelete(transaction._id)}
                      className="btn-delete"
                      aria-label={t('buttons.delete')}
                      title={t('buttons.delete')}
                    >
                      🗑
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <p className="no-data">{t('transactions.noData')}</p>
        )}
      </div>
    </div>
  );
};

export default TransactionsManagement;
