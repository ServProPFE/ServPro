import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'servpro_token';
const USER_KEY = 'servpro_user';

export const storage = {
  async getValue(key: string) {
    return AsyncStorage.getItem(key);
  },
  async setValue(key: string, value: string) {
    return AsyncStorage.setItem(key, value);
  },
  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string) {
    return AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async getUser() {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },
  async setUser(user: unknown) {
    return AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async clearAuth() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },
};
