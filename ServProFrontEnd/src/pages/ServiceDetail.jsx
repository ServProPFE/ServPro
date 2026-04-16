import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import BookingModal from '../components/BookingModal';
import { resolveServiceName } from '../utils/serviceName';
import '../styles/ServiceDetail.css';

const ServiceDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    fetchServiceDetails();
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch service data
      const serviceData = await apiService.get(API_ENDPOINTS.SERVICE_BY_ID(id));
      setService(serviceData);

      // Fetch provider info if available
      if (serviceData?.provider) {
        setProviderInfo(serviceData.provider);
      }

      // Fetch reviews for this service (don't let reviews error break service display)
      try {
        const reviewsData = await apiService.get(API_ENDPOINTS.SERVICE_REVIEWS(id));
        // Backend returns { items: [...] }
        const reviewsArray = Array.isArray(reviewsData?.items) 
          ? reviewsData.items 
          : (Array.isArray(reviewsData) ? reviewsData : []);
        setReviews(reviewsArray);
      } catch (reviewErr) {
        console.error('Error fetching reviews:', reviewErr);
        setReviews([]);
      }
    } catch (err) {
      console.error('Error fetching service details:', err);
      setError(err.message || t('common.error', { message: 'Service load failed' }));
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user.type !== 'CLIENT') {
      alert(t('service.onlyClients'));
      return;
    }

    setShowBookingModal(true);
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (error) {
    return <div className="error">{t('common.error', { message: error })}</div>;
  }

  if (!service) {
    return <div className="error">{t('service.notFound')}</div>;
  }

  return (
    <div className="service-detail">
      <div className="service-header">
        <h1>{resolveServiceName(t, service.name)}</h1>
        <span className="category-badge">{t(`services.categories.${service.category}`)}</span>
      </div>

      <div className="service-content">
        <div className="service-main">
          <div className="service-info">
            <h2>{t('service.description')}</h2>
            <p>{service.description || t('service.noDescription')}</p>
          </div>

          <div className="service-pricing">
            <h2>{t('service.pricing')}</h2>
            <div className="price-info">
              <span className="price">{service.priceMin} {service.currency}</span>
              <span className="duration">{t('service.duration')}: {t('service.minutes', { count: service.duration })}</span>
            </div>
          </div>

          {providerInfo && (
            <div className="provider-info">
              <h2>{t('service.providerAbout')}</h2>
              <div className="provider-card">
                <h3>{providerInfo.name}</h3>
                {providerInfo.providerProfile && (
                  <>
                    {providerInfo.providerProfile.companyName && (
                      <p><strong>{t('service.company')}:</strong> {providerInfo.providerProfile.companyName}</p>
                    )}
                    {providerInfo.providerProfile.experienceYears > 0 && (
                      <p><strong>{t('service.experience')}:</strong> {t('service.years', { count: providerInfo.providerProfile.experienceYears })}</p>
                    )}
                    <span className={`status-badge ${providerInfo.providerProfile.verificationStatus}`}>
                      {providerInfo.providerProfile.verificationStatus}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="service-reviews">
            <h2>{t('service.reviews', { count: reviews.length })}</h2>
            {reviews.length > 0 ? (
              <div className="reviews-list">
                {reviews.map(review => (
                  <div key={review._id} className="review-card">
                    <div className="review-header">
                      <span className="reviewer-name">{review.reviewer?.name || t('service.reviewerFallback')}</span>
                      <span className="rating">{'⭐'.repeat(review.score || 0)} {review.score}/5</span>
                      <span className="date">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="review-comment">{review.comment || t('service.noReviewComment')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>{t('service.noReviews')}</p>
            )}
          </div>
        </div>

        <div className="service-sidebar">
          <div className="booking-card">
              <h3>{t('service.bookThis')}</h3>
            <div className="price-display">
                <span className="label">{t('service.from')}</span>
              <span className="amount">{service.priceMin} {service.currency}</span>
            </div>
            <button className="btn-book" onClick={handleBookNow}>
                {t('service.bookNow')}
            </button>
          </div>
        </div>
      </div>

      {showBookingModal && (
        <BookingModal
          service={service}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            navigate('/my-bookings');
          }}
        />
      )}
    </div>
  );
};

export default ServiceDetail;
