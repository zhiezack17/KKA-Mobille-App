import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthApi } from '../api/endpoints';
import { setApiToken } from '../api/client';
import { loadApiUrl } from '../config';
import type { ApiUser } from '../types';

const TOKEN_KEY = 'kka_token_v1';
const USER_KEY = 'kka_user_v1';

interface AuthContextValue {
  token: string | null;
  user: ApiUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<ApiUser>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (user: ApiUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<ApiUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await loadApiUrl();
      try {
        const t = await SecureStore.getItemAsync(TOKEN_KEY);
        const u = await SecureStore.getItemAsync(USER_KEY);
        if (t && u) {
          setApiToken(t);
          setToken(t);
          setUserState(JSON.parse(u) as ApiUser);
        }
      } catch {
        // abaikan, tampilkan login
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await AuthApi.login(email.trim(), password);
    setApiToken(result.token);
    setToken(result.token);
    setUserState(result.user);
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AuthApi.logout();
    } catch {
      // token mungkin sudah kedaluwarsa di server; tetap bersihkan lokal
    }
    setApiToken(null);
    setToken(null);
    setUserState(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await AuthApi.me();
    setUserState(me);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(me));
  }, []);

  const setUser = useCallback(async (u: ApiUser) => {
    setUserState(u);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, signIn, signOut, refreshMe, setUser }),
    [token, user, ready, signIn, signOut, refreshMe, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
