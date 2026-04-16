import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authService, type AuthUser, type UserType } from '@/services/authService';

type RegisterInput = {
  type: UserType;
  name: string;
  email: string;
  phone: string;
  password: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const restored = await authService.restoreUser();
      setUser(restored);
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authenticated = await authService.login(email, password);
    setUser(authenticated ?? null);
  }, []);

  const register = useCallback(async (payload: RegisterInput) => {
    const authenticated = await authService.register(payload);
    setUser(authenticated ?? null);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: !!user, login, register, logout }),
    [isLoading, login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
