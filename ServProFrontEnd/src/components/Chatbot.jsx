import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { resolveServiceName } from '../utils/serviceName';
import '../styles/Chatbot.css';

const normalizeItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [awaitingPreference, setAwaitingPreference] = useState(false);
  const [preferenceContextMessage, setPreferenceContextMessage] = useState('');
  const [catalogPriceRange, setCatalogPriceRange] = useState(null);
  const messagesEndRef = useRef(null);

  const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const resolveServiceId = (service) => service?.id || service?._id;

  const normalizeBotMessage = useCallback((text) => {
    const raw = (text || '').trim();
    if (!raw) {
      return t('chatbot.error');
    }

    const isLegacyUnavailable = raw.toLowerCase().includes('ai service is currently unavailable');
    if (isLegacyUnavailable) {
      return 'I can help with plumbing, electrical, HVAC, or cleaning. Send your request and I will suggest the right service.';
    }

    return raw;
  }, [t]);

  const resolveSuggestions = (data, lang) => {
    if (Array.isArray(data?.suggestions)) {
      return data.suggestions;
    }
    if (Array.isArray(data?.[lang])) {
      return data[lang];
    }
    if (Array.isArray(data?.en)) {
      return data.en;
    }
    return [];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSuggestions = useCallback(async () => {
    try {
      const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
      const data = await apiService.get(`${API_ENDPOINTS.CHATBOT_SUGGESTIONS}?language=${lang}`);
      setSuggestions(resolveSuggestions(data, lang));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }, [i18n.language]);

  useEffect(() => {
    // Load suggestions when chatbot opens, and refresh if language changed.
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, loadSuggestions]);

  useEffect(() => {
    let isActive = true;

    const loadCatalogPriceRange = async () => {
      try {
        const data = await apiService.get(API_ENDPOINTS.SERVICES);
        const services = normalizeItems(data)
          .map((service) => ({
            price: Number(service?.priceMin),
            currency: service?.currency || 'TND',
          }))
          .filter((service) => Number.isFinite(service.price));

        if (!isActive || services.length === 0) {
          return;
        }

        const prices = services.map((service) => service.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const currency = services.find((service) => service.price === minPrice)?.currency || 'TND';

        setCatalogPriceRange({
          min: minPrice,
          max: maxPrice,
          currency,
        });
      } catch {
        if (isActive) {
          setCatalogPriceRange(null);
        }
      }
    };

    void loadCatalogPriceRange();

    return () => {
      isActive = false;
    };
  }, []);

  const formatServicePrice = (service) => {
    const priceMin = Number(service?.priceMin);
    const priceMax = Number(service?.priceMax);
    const currency = service?.currency || catalogPriceRange?.currency || 'TND';

    if (Number.isFinite(priceMin) && Number.isFinite(priceMax)) {
      return `${priceMin} - ${priceMax} ${currency}`;
    }

    if (catalogPriceRange) {
      return `${catalogPriceRange.min} - ${catalogPriceRange.max} ${catalogPriceRange.currency}`;
    }

    if (Number.isFinite(priceMin)) {
      return `${priceMin} ${currency}`;
    }

    return `0 ${currency}`;
  };

  const handleSendMessage = async (messageText = null) => {
    const message = messageText || inputMessage.trim();
    if (!message) return;

    if (!isAuthenticated) {
      setMessages([...messages, {
        id: createMessageId(),
        type: 'bot',
        text: t('chatbot.loginRequired'),
        timestamp: new Date()
      }]);
      return;
    }

    // Add user message to chat
    const userMessage = {
      id: createMessageId(),
      type: 'user',
      text: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
      const isFirstPrompt = messages.filter((chatMessage) => chatMessage.type === 'user').length === 0;
      const preferencePrefix = language === 'ar' ? 'الأولوية' : 'Preference';
      const outboundMessage = awaitingPreference && preferenceContextMessage
        ? `${preferenceContextMessage}. ${preferencePrefix}: ${message}`
        : message;

      const response = await apiService.post(API_ENDPOINTS.CHATBOT, {
        message: outboundMessage,
        language: language,
        isFirstPrompt
      });

      if (response?.needsPreference) {
        setAwaitingPreference(true);
        setPreferenceContextMessage(message);
      } else {
        setAwaitingPreference(false);
        setPreferenceContextMessage('');
      }

      const botMessage = {
        id: createMessageId(),
        type: 'bot',
        text: normalizeBotMessage(response?.message),
        service: response?.recommendedService || response?.service || null,
        confidence: response?.confidence,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch {
      const errorMessage = {
        type: 'bot',
        text: t('chatbot.error'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getProviderDisplay = (provider) => {
    if (!provider) return '';
    if (typeof provider === 'string') return provider;

    const parts = [provider.name, provider.email, provider.phone].filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : '';
  };

  return (
    <div className="chatbot-container">
      {/* Chat Toggle Button */}
      <button
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('chatbot.toggle')}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <span className="chatbot-icon">🤖</span>
              <div>
                <h3>{t('chatbot.title')}</h3>
                <p className="chatbot-subtitle">{t('chatbot.subtitle')}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="chatbot-close">
              ✕
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <div className="welcome-icon">👋</div>
                <h4>{t('chatbot.welcome')}</h4>
                <p>{t('chatbot.welcomeMessage')}</p>
                
                {suggestions.length > 0 && (
                  <div className="chatbot-suggestions">
                    <p className="suggestions-label">{t('chatbot.suggestionsLabel')}</p>
                    {suggestions.slice(0, 3).map((suggestion) => (
                      <button
                        key={suggestion}
                        className="suggestion-chip"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.type}`}>
                <div className="message-content">
                  <div className="message-text">
                    {msg.text.split('\n').map((line) => (
                      <p key={`${msg.id}-${line}`}>{line}</p>
                    ))}
                  </div>
                  {msg.service && (
                    <div className="message-service-card">
                      <h4>{resolveServiceName(t, msg.service.name)}</h4>
                      <p className="service-provider">{t('chatbot.by')} {getProviderDisplay(msg.service.provider)}</p>
                      <p className="service-price">
                        {formatServicePrice(msg.service)}
                      </p>
                      <p className="service-duration">
                        {msg.service.duration} {i18n.language?.startsWith('ar') ? 'دقيقة' : 'minutes'}
                      </p>
                      {resolveServiceId(msg.service) ? (
                        <a href={`/services/${resolveServiceId(msg.service)}`} className="service-link">
                          {t('chatbot.viewService')}
                        </a>
                      ) : null}
                    </div>
                  )}
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={t('chatbot.inputPlaceholder')}
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="send-button"
            >
              {isLoading ? '...' : '➤'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
