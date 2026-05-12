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

const resolveRecommendedServices = (services, fallbackService = null) => {
  if (Array.isArray(services)) {
    return services;
  }

  if (fallbackService) {
    return [fallbackService];
  }

  return [];
};

const CHAT_STORAGE_KEY = 'servpro_chatbot_history';
const REACTIONS = ['👍', '❤️', '😊', '🤔'];

const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [awaitingPreference, setAwaitingPreference] = useState(false);
  const [pendingRequest, setPendingRequest] = useState('');
  const [reactionMenu, setReactionMenu] = useState(null);
  const messagesEndRef = useRef(null);

  const preferenceChoices = ['cheapest', 'fastest', 'closest', 'most_expensive', 'farthest'];

  const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const resolveServiceId = (service) => service?.id || service?._id;

  // Load chat history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(CHAT_STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setMessages(parsed);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

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
  }, [messages, isLoading]);

  useEffect(() => {
    // Show welcome message on first open
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: createMessageId(),
        type: 'bot',
        text: t('chatbot.welcome') + '\n\n' + t('chatbot.welcomeMessage'),
        timestamp: new Date(),
        reactions: {}
      }]);
    }
  }, [isOpen, messages.length, t]);

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
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen, loadSuggestions]);

  const formatServicePrice = (service) => {
    const priceMin = Number(service?.priceMin);
    const priceMax = Number(service?.priceMax);
    const currency = service?.currency || 'TND';

    if (Number.isFinite(priceMin) && Number.isFinite(priceMax) && priceMax > priceMin) {
      return `${priceMin} - ${priceMax} ${currency}`;
    }

    if (Number.isFinite(priceMin)) {
      return `${priceMin} ${currency}`;
    }

    if (Number.isFinite(priceMax)) {
      return `${priceMax} ${currency}`;
    }

    return `- ${currency}`;
  };

  // Check if preference can be inferred from text
  const inferPreference = (text) => {
    if (!text) return null;
    const v = text.trim().toLowerCase();
    if (/cheap|cheapest|budget|low|ارخص|الأرخص|اقل/.test(v)) return 'cheapest';
    if (/expensive|premium|most|اغلى|الأغلى/.test(v)) return 'most_expensive';
    if (/close|closest|near|nearest|nearby|اقرب|الأقرب/.test(v)) return 'closest';
    if (/far|farthest|furthest|ابعد|الأبعد/.test(v)) return 'farthest';
    if (/fast|fastest|quick|urgent|soon|اسرع|الأسرع/.test(v)) return 'fastest';
    return null;
  };

  // Build conversation context for API
  const buildConversationContext = () => {
    return messages
      .filter(msg => msg.type === 'user' || (msg.type === 'bot' && msg.confidence))
      .map(msg => ({
        type: msg.type,
        text: msg.text,
        service: msg.service
      }));
  };

  // Helper function to send chat request to API
  const sendChatRequest = async (messageText, preference) => {
    setIsLoading(true);
    try {
      const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
      const response = await apiService.post(API_ENDPOINTS.CHATBOT, {
        message: messageText,
        preference: preference,
        language: language,
        conversationHistory: buildConversationContext()
      });

      const fallbackService = response?.recommendedService || response?.service || null;
      const recommendedServices = resolveRecommendedServices(response?.recommendedServices, fallbackService);

      const botMessage = {
        id: createMessageId(),
        type: 'bot',
        text: normalizeBotMessage(response?.message),
        services: recommendedServices,
        service: fallbackService,
        confidence: response?.confidence,
        timestamp: new Date(),
        reactions: {},
        followUpQuestions: generateFollowUpQuestions(recommendedServices)
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: createMessageId(),
        type: 'bot',
        text: t('chatbot.error'),
        timestamp: new Date(),
        reactions: {}
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (messageText = null, displayText = null) => {
    const payloadText = (messageText || inputMessage.trim());
    const visibleText = (displayText || messageText || inputMessage.trim());
    if (!payloadText) return;

    if (!isAuthenticated) {
      setMessages([...messages, {
        id: createMessageId(),
        type: 'bot',
        text: t('chatbot.loginRequired'),
        timestamp: new Date(),
        reactions: {}
      }]);
      return;
    }

    const userMessage = {
      id: createMessageId(),
      type: 'user',
      text: visibleText,
      timestamp: new Date(),
      reactions: {}
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setReactionMenu(null);

    // Try to infer preference from current message
    const inferredPref = inferPreference(payloadText);

    // If preference can be inferred, send directly; otherwise ask
    if (inferredPref && pendingRequest) {
      // We have both service request and preference
      await sendChatRequest(pendingRequest, inferredPref);
      setAwaitingPreference(false);
      setPendingRequest('');
    } else if (!pendingRequest) {
      // First message - capture as request
      setPendingRequest(payloadText);
      
      // Check if preference was inferred
      if (inferredPref) {
        // Preference was inferred, proceed with request
        await sendChatRequest(payloadText, inferredPref);
        setPendingRequest('');
      } else {
        // Only ask for preference if it can't be inferred
        setAwaitingPreference(true);
        setMessages(prev => [...prev, {
          id: createMessageId(),
          type: 'bot',
          text: t('chatbot.preferencePrompt'),
          timestamp: new Date(),
          reactions: {}
        }]);
      }
    }
  };

  const generateFollowUpQuestions = (services) => {
    if (services.length === 0) return [];
    const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
    
    if (language === 'ar') {
      return ['أخبرني المزيد', 'قارن الأسعار', 'عرض الملف الشخصي', 'احفظ للاحقا'];
    }
    return ['Tell me more', 'Compare prices', 'View profile', 'Save for later'];
  };

  const handleAddReaction = (messageId, reaction) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        if (reactions[reaction]) {
          delete reactions[reaction];
        } else {
          reactions[reaction] = true;
        }
        return { ...msg, reactions };
      }
      return msg;
    }));
    setReactionMenu(null);
  };

  const handleClearHistory = () => {
    if (globalThis.confirm(t('chatbot.clearHistoryConfirm') || 'Clear chat history?')) {
      setMessages([]);
      localStorage.removeItem(CHAT_STORAGE_KEY);
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
        title={isOpen ? t('chatbot.close') : t('chatbot.open')}
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
            <div className="chatbot-header-actions">
              <button 
                onClick={handleClearHistory} 
                className="chatbot-clear"
                title={t('chatbot.clearHistory') || 'Clear history'}
              >
                🗑️
              </button>
              <button onClick={() => setIsOpen(false)} className="chatbot-close">
                ✕
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-welcome">
                <div className="welcome-icon">👋</div>
                <h4>{t('chatbot.welcome')}</h4>
                <p>{t('chatbot.welcomeMessage')}</p>
                <p style={{ fontSize: '0.85em', color: '#666', marginTop: '8px' }}>{t('chatbot.preferenceHint')}</p>
                
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

            {awaitingPreference && (
              <div className="chatbot-preferences">
                <p className="preferences-label">{t('chatbot.preferenceActionsLabel')}</p>
                <div className="preferences-grid">
                  {preferenceChoices.map((choice) => (
                    <button
                      key={choice}
                      className="preference-chip"
                      onClick={() => handleSendMessage(choice, t(`chatbot.preferences.${choice}`))}
                    >
                      {t(`chatbot.preferences.${choice}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, msgIndex) => {
              const hasArrayServices = Array.isArray(msg.services) && msg.services.length > 0;
              const messageServices = hasArrayServices
                ? msg.services
                : resolveRecommendedServices(null, msg.service);

              return (
                <div key={msg.id} className={`message ${msg.type}`}>
                  <div className="message-content">
                    <div className="message-text">
                      {msg.text.split('\n').map((line) => (
                        <p key={`${msg.id}-${line}`}>{line}</p>
                      ))}
                    </div>

                    {messageServices.map((recommendedService, index) => (
                      <div
                        key={`${msg.id}-${resolveServiceId(recommendedService) || index}`}
                        className="message-service-card"
                      >
                        <h4>{resolveServiceName(t, recommendedService.name)}</h4>
                        <p className="service-provider">{t('chatbot.by')} {getProviderDisplay(recommendedService.provider)}</p>
                        <p className="service-price">
                          {formatServicePrice(recommendedService)}
                        </p>
                        <p className="service-duration">
                          {recommendedService.duration} {i18n.language?.startsWith('ar') ? 'دقيقة' : 'minutes'}
                        </p>
                        
                        {/* Follow-up action buttons */}
                        <div className="service-actions">
                          {resolveServiceId(recommendedService) ? (
                            <>
                              <a href={`/services/${resolveServiceId(recommendedService)}`} className="action-btn book-btn">
                                📋 {t('chatbot.bookNow') || 'Book Now'}
                              </a>
                              <a href={`/services/${resolveServiceId(recommendedService)}`} className="action-btn view-btn">
                                👤 {t('chatbot.viewProfile') || 'View Profile'}
                              </a>
                            </>
                          ) : null}
                          <button className="action-btn favorite-btn" title="Add to favorites">
                            ⭐ {t('chatbot.favorite') || 'Favorite'}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Follow-up questions */}
                    {msg.type === 'bot' && msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="follow-up-questions">
                        <p className="follow-up-label">{t('chatbot.followUp') || 'What next?'}</p>
                        <div className="follow-up-chips">
                          {msg.followUpQuestions.map((question) => (
                            <button
                              key={`${msg.id}-${question}`}
                              className="follow-up-chip"
                              onClick={() => handleSendMessage(question)}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reaction buttons */}
                    <div className="message-reactions">
                      <div className="reaction-display">
                        {Object.entries(msg.reactions || {}).map(([reaction]) => (
                          <span key={reaction} className="reaction-badge">{reaction}</span>
                        ))}
                      </div>
                      <button
                        className="reaction-toggle"
                        onClick={() => setReactionMenu(reactionMenu === msg.id ? null : msg.id)}
                        title="Add reaction"
                      >
                        😊
                      </button>
                      {reactionMenu === msg.id && (
                        <div className="reaction-menu">
                          {REACTIONS.map((reaction) => (
                            <button
                              key={reaction}
                              className="reaction-option"
                              onClick={() => handleAddReaction(msg.id, reaction)}
                            >
                              {reaction}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString(i18n.language, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator" title="AI is typing...">
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
