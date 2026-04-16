import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'servpro_token';
const USER_KEY = 'servpro_user';
const canUseBrowserStorage = typeof window !== 'undefined';

const safeGetItem = async (key: string) => {
  if (!canUseBrowserStorage) {
    return null;
  }

  return AsyncStorage.getItem(key);
};

const safeSetItem = async (key: string, value: string) => {
  if (!canUseBrowserStorage) {
    return;
  }

  return AsyncStorage.setItem(key, value);
};

const safeRemoveItem = async (key: string) => {
  if (!canUseBrowserStorage) {
    return;
  }

  return AsyncStorage.removeItem(key);
};

export const storage = {
  async getValue(key: string) {
    return safeGetItem(key);
  },
  async setValue(key: string, value: string) {
    return safeSetItem(key, value);
  },
  async getToken() {
    return safeGetItem(TOKEN_KEY);
  },
  async setToken(token: string) {
    return safeSetItem(TOKEN_KEY, token);
  },
  async getUser() {
    const data = await safeGetItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  async setUser(user: unknown) {
    return safeSetItem(USER_KEY, JSON.stringify(user));
  },
  async clearAuth() {
    await safeRemoveItem(TOKEN_KEY);
    await safeRemoveItem(USER_KEY);
  },
};
