import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/client';

interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, organizationName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const USER_KEY = 'cloudbot_user';
const TOKEN_KEY = 'cloudbot_token';
const ORG_KEY = 'cloudbot_org_id';

function getStoredUser(): User | null {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const loading = false;

  useEffect(() => {
    if (!token) setUser(null);
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ user: User; accessToken: string }>('/auth/login', { email, password });
    if (!res.success || !res.data) throw new Error('Login failed');
    const { user: u, accessToken } = res.data;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(ORG_KEY, u.organizationId);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(accessToken);
    setUser(u);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, name: string, organizationName: string) => {
      const res = await api.post<{ user: User; accessToken: string }>('/auth/signup', {
        email,
        password,
        name,
        organizationName,
      });
      if (!res.success || !res.data) throw new Error('Signup failed');
      const { user: u, accessToken } = res.data;
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(ORG_KEY, u.organizationId);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setToken(accessToken);
      setUser(u);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ORG_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
