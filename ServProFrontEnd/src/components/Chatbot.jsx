import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import apiService from '../services/apiService';
import { resolveServiceName } from '../utils/serviceName';
import '../styles/Chatbot.css';

const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const resolveServiceId = (service) => service?.id || service?._id;

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

  const handleSendMessage = async (messageText = null) => {
    const message = messageText || inputMessage.trim();
    if (!message) return;

    if (!isAuthenticated) {
      setMessages([...messages, {
        type: 'bot',
        text: t('chatbot.loginRequired'),
        timestamp: new Date()
      }]);
      return;
    }

    // Add user message to chat
    const userMessage = {
      type: 'user',
      text: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
      const response = await apiService.post(API_ENDPOINTS.CHATBOT, {
        message: message,
        language: language
      });

      const botMessage = {
        type: 'bot',
        text: response?.message || t('chatbot.error'),
        service: response?.recommendedService || response?.service || null,
        confidence: response?.confidence,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'bot',
        text: error?.message ? `${t('chatbot.error')} (${error.message})` : t('chatbot.error'),
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
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <button
                        key={index}
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

            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                <div className="message-content">
                  <div className="message-text">
                    {msg.text.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  {msg.service && (
                    <div className="message-service-card">
                      <h4>{resolveServiceName(t, msg.service.name)}</h4>
                      <p className="service-provider">{t('chatbot.by')} {getProviderDisplay(msg.service.provider)}</p>
                      <p className="service-price">
                        {msg.service.priceMin} {msg.service.currency}
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
              onKeyPress={handleKeyPress}
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
