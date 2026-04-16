const TOKEN_KEY = 'servpro_token';
const USER_KEY = 'servpro_user';
const LANGUAGE_KEY = 'servpro_language';
const canUseLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeGetItem = (key: string) => {
  if (!canUseLocalStorage) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  if (!canUseLocalStorage) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const safeRemoveItem = (key: string) => {
  if (!canUseLocalStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
};

export const storage = {
  async getValue(key: string) {
    return safeGetItem(key);
  },
  async setValue(key: string, value: string) {
    safeSetItem(key, value);
  },
  async getToken() {
    return safeGetItem(TOKEN_KEY);
  },
  async setToken(token: string) {
    safeSetItem(TOKEN_KEY, token);
  },
  async getUser() {
    const data = safeGetItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  async setUser(user: unknown) {
    safeSetItem(USER_KEY, JSON.stringify(user));
  },
  async clearAuth() {
    safeRemoveItem(TOKEN_KEY);
    safeRemoveItem(USER_KEY);
  },
  async clearLanguage() {
    safeRemoveItem(LANGUAGE_KEY);
  },
};
