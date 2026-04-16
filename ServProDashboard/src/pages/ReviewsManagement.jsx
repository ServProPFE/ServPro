import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import '../styles/Reviews.css';

const ReviewsManagement = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await apiService.get(API_ENDPOINTS.REVIEWS);
      let reviewsArray = [];
      if (Array.isArray(data?.items)) {
        reviewsArray = data.items;
      } else if (Array.isArray(data)) {
        reviewsArray = data;
      }
      setReviews(reviewsArray);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err.message);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!globalThis.confirm(t('reviews.confirmDelete'))) {
      return;
    }

    try {
      await apiService.delete(`${API_ENDPOINTS.REVIEW_BY_ID(reviewId)}`);
      fetchReviews();
    } catch (err) {
      console.error('Error deleting review:', err);
      alert(t('common.error', { message: err.message }));
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  return (
    <div className="reviews-management">
      <div className="page-header">
        <h1>{t('reviews.title')}</h1>
      </div>

      <div className="reviews-table">
        <table>
          <thead>
            <tr>
              <th>{t('common.id')}</th>
              <th>{t('reviews.service')}</th>
              <th>{t('reviews.reviewer')}</th>
              <th>{t('reviews.rating')}</th>
              <th>{t('reviews.comment')}</th>
              <th>{t('common.date')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(review => (
              <tr key={review._id}>
                <td>{review._id.substring(0, 8)}...</td>
                <td>{review.reservation?.service?.name ? t(review.reservation.service.name) : 'N/A'}</td>
                <td>{review.reviewer?.name || 'N/A'}</td>
                <td>
                  <span className="rating">
                    {'⭐'.repeat(review.score || 0)}
                  </span>
                  {review.score || 0}/5
                </td>
                <td className="comment">{review.comment || t('reviews.noComment')}</td>
                <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                <td className="actions">
                  <button
                    onClick={() => handleDeleteReview(review._id)}
                    className="btn-delete"
                    aria-label={t('buttons.delete')}
                    title={t('buttons.delete')}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews.length === 0 && (
          <p className="no-data">{t('reviews.noData')}</p>
        )}
      </div>
    </div>
  );
};

export default ReviewsManagement;
