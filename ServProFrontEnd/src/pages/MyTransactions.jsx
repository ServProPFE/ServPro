import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import Navbar from '../components/Navbar';
import { resolveServiceName } from '../utils/serviceName';
import '../styles/MyTransactions.css';

const MyTransactions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const statuses = ['ALL', 'PENDING', 'SUCCESS', 'FAILED'];

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.TRANSACTIONS);
      const transactionsArray = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
      setTransactions(transactionsArray);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = filter === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.status === filter);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-container">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="error-container">
          <div className="error">{t('common.error', { message: error })}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="my-transactions-page">
        <div className="transactions-container">
          <div className="page-header">
            <h1>{t('transactions.title')}</h1>
            <p className="subtitle">{t('transactions.subtitle')}</p>
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

          {filteredTransactions.length === 0 ? (
            <div className="no-transactions">
              <div className="icon">💳</div>
              <h3>{t('transactions.noData')}</h3>
              <p>{t('transactions.noDataMessage')}</p>
            </div>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map(transaction => (
                <div key={transaction._id} className="transaction-card">
                  <div className="transaction-header">
                    <div className="transaction-info">
                      <span className="transaction-id">
                        {t('transactions.id')}: {transaction._id.substring(0, 8)}...
                      </span>
                      <span className="transaction-date">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`status-badge ${transaction.status}`}>
                      {t(`transactions.filters.${transaction.status}`)}
                    </span>
                  </div>
                  
                  <div className="transaction-body">
                    <div className="transaction-detail">
                      <span className="label">{t('transactions.amount')}:</span>
                      <span className="value amount">
                        {transaction.amount} {transaction.currency}
                      </span>
                    </div>
                    
                    <div className="transaction-detail">
                      <span className="label">{t('transactions.method')}:</span>
                      <span className={`method-badge ${transaction.method}`}>
                        {transaction.method}
                      </span>
                    </div>

                    {transaction.booking && (
                      <div className="transaction-detail">
                        <span className="label">{t('transactions.booking')}:</span>
                        <span className="value">
                          {resolveServiceName(t, transaction.booking.service?.name, 'Service')} - {transaction.booking.provider?.name || 'Provider'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MyTransactions;
