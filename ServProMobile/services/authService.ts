import { API_ENDPOINTS } from '@/services/apiConfig';
import { storage } from '@/services/storage';

export type UserType = 'CLIENT' | 'PROVIDER';

export type AuthUser = {
  id?: string;
  _id?: string;
  type: UserType;
  name: string;
  email: string;
  phone?: string;
};

type AuthPayload = {
  token?: string;
  user?: AuthUser;
  message?: string;
};

class AuthService {
  async restoreUser() {
    return storage.getUser();
  }

  async login(email: string, password: string) {
    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = (await response.json()) as AuthPayload;
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.token) {
      await storage.setToken(data.token);
    }
    if (data.user) {
      await storage.setUser(data.user);
    }

    return data.user;
  }

  async register(payload: {
    type: UserType;
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const response = await fetch(API_ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, passwordHash: payload.password }),
    });

    const data = (await response.json()) as AuthPayload;
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    if (data.token) {
      await storage.setToken(data.token);
    }
    if (data.user) {
      await storage.setUser(data.user);
    }

    return data.user;
  }

  async logout() {
    await storage.clearAuth();
  }
}

export const authService = new AuthService();
