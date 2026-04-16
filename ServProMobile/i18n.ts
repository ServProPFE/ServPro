import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '@/locales/ar.json';
import en from '@/locales/en.json';
import { storage } from '@/services/storage';

const LANGUAGE_KEY = 'servpro_language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (language: string) => void) => {
    const stored = await storage.getValue(LANGUAGE_KEY);
    if (stored) {
      callback(stored);
      return;
    }

    const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
    callback(locale === 'ar' ? 'ar' : 'en');
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    await storage.setValue(LANGUAGE_KEY, language);
  },
};

i18n.use(languageDetector).use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
