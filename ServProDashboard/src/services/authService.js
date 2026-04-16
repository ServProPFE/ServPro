import { API_ENDPOINTS } from '../config/api';

class AuthService {
  async login(email, password) {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Ensure user is PROVIDER or ADMIN
      if (data.user && (data.user.type === 'PROVIDER' || data.user.type === 'ADMIN')) {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
      } else {
        throw new Error('Accès refusé. Cette interface est réservée aux prestataires et administrateurs.');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Ensure user is PROVIDER or ADMIN
      if (data.user && (data.user.type === 'PROVIDER' || data.user.type === 'ADMIN')) {
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
      } else {
        throw new Error('Seuls les prestataires et administrateurs peuvent s\'inscrire via cette interface.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  isProvider() {
    const user = this.getCurrentUser();
    return user && user.type === 'PROVIDER';
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.type === 'ADMIN';
  }
}

export default new AuthService();
