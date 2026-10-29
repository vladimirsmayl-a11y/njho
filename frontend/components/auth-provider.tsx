'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, api, body, errorText, isNetworkError } from '@/lib/api';
import { demoUser } from '@/lib/demo';

export interface User {
  id: string;
  telegram_id: number | null;
  username: string | null;
  email: string | null;
  avatar_url?: string | null;
  has_custom_password?: boolean;
  credentials_sent?: boolean;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  is_admin?: boolean;
  role?: 'owner' | 'curator' | 'member' | string;
  language?: string;
  referral_code?: string | null;
  subscription_status?: string | null;
  has_access?: boolean;
  tier: 'free' | 'standard' | 'pro' | 'premium' | null;
  streak: number;
  best_streak?: number;
  completed_today: number;
  total_tasks: number;
  freeze_count?: number;
  day_progress?: number;
}

/** Ответ GET /me — реальный контракт бэкенда. */
interface MeResponse {
  id: number | string;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  tier?: User['tier'];
  subscription_status?: string | null;
  has_access?: boolean;
  is_admin?: boolean;
  role?: string;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  language?: string;
  referral_code?: string | null;
  has_custom_password?: boolean;
  telegram_id?: number | null;
  streak?: number;
  completed_today?: number;
  total_tasks?: number;
  freeze_count?: number;
  day_progress?: number;
}

/** Приводит ответ /me к форме, на которую рассчитывает интерфейс. */
function normalizeUser(remote: MeResponse): User {
  return {
    id: String(remote.id),
    telegram_id: remote.telegram_id ?? null,
    username: remote.username ?? null,
    email: remote.email ?? null,
    avatar_url: remote.avatar_url ?? null,
    has_custom_password: remote.has_custom_password ?? false,
    is_admin: remote.is_admin ?? false,
    role: remote.role ?? (remote.is_admin ? 'owner' : 'member'),
    is_blocked: remote.is_blocked ?? false,
    blocked_reason: remote.blocked_reason ?? null,
    language: remote.language ?? 'ru',
    referral_code: remote.referral_code ?? null,
    subscription_status: remote.subscription_status ?? null,
    has_access: remote.has_access ?? true,
    tier: remote.tier ?? null,
    streak: remote.streak ?? 0,
    completed_today: remote.completed_today ?? 0,
    total_tasks: remote.total_tasks ?? 0,
    freeze_count: remote.freeze_count ?? 0,
    day_progress: remote.day_progress ?? 0,
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    referral_code?: string;
    language?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  enterDemo: () => void;
}

const DEMO_KEY = 'lvs:demo';

const DEMO_USER: User = {
  id: demoUser.id,
  telegram_id: null,
  username: demoUser.username,
  email: demoUser.email,
  avatar_url: demoUser.avatar_url,
  tier: demoUser.tier,
  streak: demoUser.streak,
  completed_today: demoUser.completed_today,
  total_tasks: demoUser.total_tasks,
  freeze_count: demoUser.freeze_count,
  day_progress: demoUser.day_progress,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const enterDemo = useCallback(() => {
    try {
      window.localStorage.setItem(DEMO_KEY, '1');
    } catch {
      /* РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј */
    }
    setUser(DEMO_USER);
    setDemo(true);
    setError(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const remote = await api<MeResponse>('/me');
      const nextUser = normalizeUser(remote);

      // Серия живёт в статистике трекера, а не в /me. Один запрос при загрузке —
      // чтобы сайдбар и карточки показывали одно и то же число.
      if (remote.has_access !== false) {
        const now = new Date();
        const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate(),
        ).padStart(2, '0')}`;
        try {
          const day = await api<{ streak?: number; best_streak?: number }>(`/dashboard?today=${iso}`);
          if (typeof day.streak === 'number') nextUser.streak = day.streak;
          if (typeof day.best_streak === 'number') nextUser.best_streak = day.best_streak;
        } catch {
          /* статистика не критична для входа */
        }
      }

      setUser(nextUser);
      setDemo(false);
      setError(null);
      try {
        window.localStorage.removeItem(DEMO_KEY);
      } catch {
        /* РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј */
      }
    } catch (e) {
      if (isNetworkError(e)) {
        /* Р‘СЌРєРµРЅРґ РЅРµРґРѕСЃС‚СѓРїРµРЅ вЂ” РїСЂРѕРґРѕР»Р¶Р°РµРј РІ РґРµРјРѕ-СЂРµР¶РёРјРµ, С‡РµСЃС‚РЅРѕ РїРѕРјРµС‡Р°СЏ РµРіРѕ. */
        setUser(DEMO_USER);
        setDemo(true);
        setError(null);
      } else if (e instanceof ApiError && e.status === 401) {
        let demoOn = false;
        try {
          demoOn = window.localStorage.getItem(DEMO_KEY) === '1';
        } catch {
          /* РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј */
        }
        setUser(demoOn ? DEMO_USER : null);
        setDemo(demoOn);
        setError(null);
      } else {
        setUser(null);
        setDemo(false);
        setError(errorText(e));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (identifier: string, password: string) => {
    setError(null);
    try {
      await api('/auth/login', { method: 'POST', body: body({ identifier, password }) });
      await refresh();
    } catch (e) {
      if (isNetworkError(e)) {
        enterDemo();
        return;
      }
      setError(errorText(e));
      throw e;
    }
  };

  const register = async (payload: {
    username: string;
    email: string;
    password: string;
    referral_code?: string;
    language?: string;
  }) => {
    setError(null);
    try {
      await api('/auth/register', { method: 'POST', body: body(payload) });
      await refresh();
    } catch (e) {
      if (isNetworkError(e)) {
        enterDemo();
        return;
      }
      setError(errorText(e));
      throw e;
    }
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* РІС‹С…РѕРґРёРј Р»РѕРєР°Р»СЊРЅРѕ РІ Р»СЋР±РѕРј СЃР»СѓС‡Р°Рµ */
    }
    try {
      window.localStorage.removeItem(DEMO_KEY);
    } catch {
      /* РїСЂРёРІР°С‚РЅС‹Р№ СЂРµР¶РёРј */
    }
    setUser(null);
    setDemo(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, demo, login, register, logout, refresh, enterDemo }}>
      {children}
    </AuthContext.Provider>
  );
}
