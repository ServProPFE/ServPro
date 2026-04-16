import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiService from '../services/apiService';
import { API_ENDPOINTS } from '../config/api';
import { resolveServiceName } from '../utils/serviceName';
import '../styles/ReviewModal.css';

const ReviewModal = ({ booking, onClose, onReviewSubmitted }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    score: 5,
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);

  const handleChange = (e) => {
    const value = e.target.name === 'score' ? Number(e.target.value) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleStarClick = (value) => {
    setFormData({
      ...formData,
      score: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        reservation: booking._id,
        reviewer: booking.client._id || booking.client,
        provider: booking.provider._id || booking.provider,
        score: Number(formData.score),
        comment: formData.comment,
      };

      await apiService.post(API_ENDPOINTS.REVIEWS, payload);
      onReviewSubmitted();
      onClose();
    } catch (err) {
      setError(err.message || t('reviews.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('reviews.title')}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="service-info">
            <strong>{t('reviews.service')}:</strong> {resolveServiceName(t, booking.service?.name, 'N/A')}
          </div>

          <div className="form-group">
            <label htmlFor="score">{t('reviews.rating')} *</label>
            <div 
              className="rating-input"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map(value => (
                <label 
                  key={value} 
                  className="star-label"
                  onMouseEnter={() => setHoverRating(value)}
                  onClick={() => handleStarClick(value)}
                >
                  <input
                    type="radio"
                    name="score"
                    value={value}
                    checked={formData.score === value}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  <span 
                    className={`star ${
                      (hoverRating > 0 ? hoverRating : formData.score) >= value ? 'filled' : ''
                    }`}
                  >
                    ⭐
                  </span>
                </label>
              ))}
            </div>
            <span className="rating-text">{formData.score}/5</span>
          </div>

          <div className="form-group">
            <label htmlFor="comment">{t('reviews.comment')}</label>
            <textarea
              id="comment"
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              rows="4"
              placeholder={t('reviews.placeholder')}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              {t('booking.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? t('reviews.submitting') : t('reviews.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
