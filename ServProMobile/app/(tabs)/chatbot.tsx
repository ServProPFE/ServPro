import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { AppBackground } from '@/components/servpro/AppBackground';
import { AppTheme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/services/apiConfig';
import { apiService } from '@/services/apiService';

type ChatRole = 'user' | 'bot';

type ChatService = {
  _id?: string;
  id?: string;
  name?: string;
  provider?: string | { _id?: string; id?: string; name?: string; email?: string; phone?: string };
  priceMin?: number;
  currency?: string;
  duration?: number;
};

type ChatResponse = {
  message?: string;
  recommendedService?: ChatService;
  service?: ChatService;
  needsPreference?: boolean;
  preferenceOptions?: string[];
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  service?: ChatService | null;
  createdAt: string;
};

type SuggestionsResponse = {
  suggestions?: string[];
  en?: string[];
  ar?: string[];
};

const resolveSuggestions = (payload: SuggestionsResponse, lang: 'en' | 'ar') => {
  if (Array.isArray(payload.suggestions)) return payload.suggestions;
  if (Array.isArray(payload[lang])) return payload[lang];
  if (Array.isArray(payload.en)) return payload.en;
  return [];
};

const resolveServiceId = (service?: ChatService | null) => service?._id || service?.id;

const resolveProviderName = (provider?: ChatService['provider']) => {
  if (!provider) return '';
  if (typeof provider === 'string') return provider;

  const parts = [provider.name, provider.email, provider.phone].filter(Boolean);
  return parts.join(' • ');
};

const normalizeBotMessage = (text: string | undefined, fallback: string) => {
  const raw = (text || '').trim();
  if (!raw) return fallback;

  const isLegacyUnavailable = raw.toLowerCase().includes('ai service is currently unavailable');
  if (isLegacyUnavailable) {
    return 'I can help with plumbing, electrical, HVAC, or cleaning. Send your request and I will suggest the right service.';
  }

  return raw;
};

export default function ChatbotScreen() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [awaitingPreference, setAwaitingPreference] = useState(false);
  const [preferenceContextMessage, setPreferenceContextMessage] = useState('');

  const chatLanguage = useMemo<'en' | 'ar'>(() => (i18n.language?.startsWith('ar') ? 'ar' : 'en'), [i18n.language]);

  const loadSuggestions = async () => {
    try {
      const payload = await apiService.get<SuggestionsResponse>(`${API_ENDPOINTS.CHATBOT_SUGGESTIONS}?language=${chatLanguage}`);
      setSuggestions(resolveSuggestions(payload, chatLanguage));
    } catch {
      setSuggestions([]);
    }
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const sendMessage = async (preset?: string) => {
    const text = (preset ?? inputValue).trim();
    if (!text || isLoading) return;

    if (!isAuthenticated) {
      addMessage({ role: 'bot', text: t('chatbot.loginRequired') });
      return;
    }

    addMessage({ role: 'user', text });
    setInputValue('');
    setIsLoading(true);

    try {
      const isFirstPrompt = messages.filter((chatMessage) => chatMessage.role === 'user').length === 0;
      const preferencePrefix = chatLanguage === 'ar' ? 'الأولوية' : 'Preference';
      const outboundMessage = awaitingPreference && preferenceContextMessage
        ? `${preferenceContextMessage}. ${preferencePrefix}: ${text}`
        : text;

      const response = await apiService.post<ChatResponse>(API_ENDPOINTS.CHATBOT, {
        message: outboundMessage,
        language: chatLanguage,
        isFirstPrompt,
      });

      if (response.needsPreference) {
        setAwaitingPreference(true);
        setPreferenceContextMessage(text);
      } else {
        setAwaitingPreference(false);
        setPreferenceContextMessage('');
      }

      addMessage({
        role: 'bot',
        text: normalizeBotMessage(response.message, t('chatbot.error')),
        service: response.recommendedService || response.service || null,
      });
    } catch {
      addMessage({
        role: 'bot',
        text: t('chatbot.error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="sparkles" size={20} color="#ffffff" />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>{t('chatbot.title')}</Text>
              <Text style={styles.heroSubtitle}>{t('chatbot.subtitle')}</Text>
            </View>
          </View>

          <Text style={styles.heroMessage}>{t('chatbot.welcomeMessage')}</Text>

          <Pressable style={styles.reloadBtn} onPress={loadSuggestions}>
            <Ionicons name="refresh" size={14} color={AppTheme.colors.primary} />
            <Text style={styles.reloadText}>{t('chatbot.suggestionsLabel')}</Text>
          </Pressable>

          {suggestions.length > 0 ? (
            <View style={styles.suggestionsWrap}>
              {suggestions.slice(0, 4).map((suggestion) => (
                <Pressable key={suggestion} style={styles.suggestionChip} onPress={() => sendMessage(suggestion)}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.chatCard}>
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbox-ellipses-outline" size={28} color={AppTheme.colors.primary} />
              <Text style={styles.emptyText}>{t('chatbot.welcome')}</Text>
            </View>
          ) : null}

          {messages.map((message) => (
            <View key={message.id} style={[styles.messageRow, message.role === 'user' ? styles.messageRowUser : styles.messageRowBot]}>
              <View style={[styles.messageBubble, message.role === 'user' ? styles.messageUser : styles.messageBot]}>
                <Text style={[styles.messageText, message.role === 'user' ? styles.messageTextUser : styles.messageTextBot]}>{message.text}</Text>

                {message.service ? (
                  <View style={styles.serviceCard}>
                    <Text style={styles.serviceTitle}>{message.service.name || t('services.title')}</Text>
                    <Text style={styles.serviceMeta}>{t('chatbot.by')} {resolveProviderName(message.service.provider)}</Text>
                    <Text style={styles.serviceMeta}>{message.service.priceMin || 0} {message.service.currency || 'TND'} • {message.service.duration || 0} min</Text>

                    <View style={styles.serviceLinks}>
                      {resolveServiceId(message.service) ? (
                        <Link href={`/service/${resolveServiceId(message.service)}` as never} style={styles.linkBtn}>
                          {t('chatbot.viewService')}
                        </Link>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          ))}

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : null}
        </View>

        {isAuthenticated ? null : (
          <View style={styles.authCard}>
            <Text style={styles.authText}>{t('chatbot.loginRequired')}</Text>
            <Link href={'/auth/login' as never} style={styles.authLink}>{t('nav.login')}</Link>
          </View>
        )}

        <View style={styles.composerCard}>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={t('chatbot.inputPlaceholder')}
            placeholderTextColor="#64748b"
            multiline
          />
          <Pressable style={[styles.sendBtn, (!inputValue.trim() || isLoading) && styles.sendBtnDisabled]} onPress={() => sendMessage()} disabled={!inputValue.trim() || isLoading}>
            <Ionicons name="arrow-up" size={16} color="#ffffff" />
          </Pressable>
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    borderRadius: AppTheme.radius.xl,
    borderWidth: 1,
    borderColor: '#0f766e20',
    backgroundColor: '#0f172a',
    padding: 16,
    ...AppTheme.shadow.card,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 13,
    marginTop: 2,
  },
  heroMessage: {
    marginTop: 12,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  reloadBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reloadText: {
    color: AppTheme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  suggestionsWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 12,
  },
  chatCard: {
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 10,
    ...AppTheme.shadow.card,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  emptyText: {
    color: AppTheme.colors.mutedText,
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '90%',
    borderRadius: 14,
    padding: 10,
  },
  messageUser: {
    backgroundColor: '#0f766e',
    borderTopRightRadius: 6,
  },
  messageBot: {
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextBot: {
    color: AppTheme.colors.text,
  },
  serviceCard: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 9,
  },
  serviceTitle: {
    color: AppTheme.colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  serviceMeta: {
    color: '#334155',
    marginTop: 4,
    fontSize: 12,
  },
  serviceLinks: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  linkBtn: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 4,
  },
  loadingText: {
    color: AppTheme.colors.mutedText,
    fontWeight: '700',
  },
  authCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...AppTheme.shadow.card,
  },
  authText: {
    color: AppTheme.colors.mutedText,
    flex: 1,
    paddingRight: 10,
  },
  authLink: {
    backgroundColor: AppTheme.colors.primary,
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontWeight: '800',
    overflow: 'hidden',
  },
  composerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    ...AppTheme.shadow.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: AppTheme.colors.text,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.primary,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
