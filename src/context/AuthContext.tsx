import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UserProfile, AuthTokens } from '../types';
import * as authApi from '../api/auth';
import { getStoredTokens, setStoredTokens } from '../api/client';

const USER_KEY = 'jobcharcha.user';

interface AuthContextValue {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: authApi.LoginPayload) => Promise<UserProfile>;
  register: (payload: authApi.RegisterPayload) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(loadStoredUser);
  const [tokens, setTokens] = useState<AuthTokens | null>(getStoredTokens);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((response: authApi.AuthResponse) => {
    const nextTokens: AuthTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
    };
    setStoredTokens(nextTokens);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setTokens(nextTokens);
    setUser(response.user);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getStoredTokens()) {
        try {
          const profile = await authApi.getMe();
          if (!cancelled) {
            setUser(profile);
            localStorage.setItem(USER_KEY, JSON.stringify(profile));
          }
        } catch {
          if (!cancelled) {
            setStoredTokens(null);
            localStorage.removeItem(USER_KEY);
            setUser(null);
            setTokens(null);
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (payload: authApi.LoginPayload) => {
    const response = await authApi.login(payload);
    persist(response);
    return response.user;
  }, [persist]);

  const register = useCallback(async (payload: authApi.RegisterPayload) => {
    const response = await authApi.register(payload);
    persist(response);
    return response.user;
  }, [persist]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    setStoredTokens(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setTokens(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authApi.getMe();
    setUser(profile);
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  }, []);

  const value: AuthContextValue = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    loading,
    login,
    register,
    logout,
    refreshProfile,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
