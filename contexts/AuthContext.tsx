import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost, authStorage, onTokensCleared } from '../lib/api';

type User = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  role: 'owner' | 'admin' | 'editor';
  permissions?: string[];
  agencyRoleId?: string | null;
  simpleAccessLevel?: string | null;
  agencyId: string;
  agencyOperationMode?: 'solo' | 'lean' | 'structured';
  agencyMode?: 'SOLO' | 'TEAM';
  hasSeenTasksOnboarding?: boolean;
  onboarding?: {
    completed: boolean;
    showGuidedTour: boolean;
    hasSeenHomeTour: boolean;
  };
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (p: { email: string; password: string }) => Promise<void>;
  signup: (p: { ownerName: string; agencyName: string; phone: string; email: string; password: string; passwordConfirm: string }) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      // Check if we have tokens before attempting to fetch user data
      const tokens = authStorage.getTokens();
      if (!tokens?.accessToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const me = await apiGet<User>('/auth/me');
      setUser(me);
    } catch (err: any) {
      try { console.debug?.('[AuthContext] refreshMe failed', err); } catch {}
      setUser(null);
      
      // If it's an auth error, clear tokens to prevent retry loops
      if (err?.message?.includes('401') || err?.message?.includes('unauthorized')) {
        authStorage.clearTokens();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (p: { email: string; password: string }) => {
    const resp = await apiPost<{ accessToken: string; refreshToken: string }>('/auth/login', p);
    authStorage.setTokens({ accessToken: resp.accessToken, refreshToken: resp.refreshToken });
    try {
      // Limpa dados locais de clientes/tarefas para evitar seeds em contas novas
      window.localStorage.removeItem('flow_clients');
      window.localStorage.removeItem('flow_tasks');
    } catch {}
    await refreshMe();
  }, [refreshMe]);
  
  const signup = useCallback(async (p: { ownerName: string; agencyName: string; phone: string; email: string; password: string; passwordConfirm: string }) => {
    const resp = await apiPost<{ tokens: { accessToken: string; refreshToken: string }; user: any; agency: any }>('/auth/signup', p);
    authStorage.setTokens({ accessToken: resp.tokens.accessToken, refreshToken: resp.tokens.refreshToken });
    try {
      window.localStorage.removeItem('flow_clients');
      window.localStorage.removeItem('flow_tasks');
    } catch {}
    await refreshMe();
  }, [refreshMe]);

  const googleLogin = useCallback(async (credential: string) => {
    const resp = await apiPost<{ accessToken: string; refreshToken: string; agencyId: string }>('/auth/google', { credential });
    authStorage.setTokens({ accessToken: resp.accessToken, refreshToken: resp.refreshToken });
    try {
      window.localStorage.removeItem('flow_clients');
      window.localStorage.removeItem('flow_tasks');
    } catch {}
    await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(() => {
    authStorage.clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Listen for token cleared events (e.g., when refresh token expires)
  useEffect(() => {
    const unsubscribe = onTokensCleared(() => {
      try { console.debug?.('[AuthContext] tokens cleared, logging out'); } catch {}
      setUser(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo(() => ({ user, loading, login, signup, googleLogin, logout, refreshMe }), [user, loading, login, signup, googleLogin, logout, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


