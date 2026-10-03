/**
 * @file src/context/AppContext.tsx
 * @description Global React Application State Provider & Central Hook Context.
 * 
 * Provides centralized reactive state and hooks across the application:
 * 1. Global Database Instance (`db`) and Active Authenticated User (`user`).
 * 2. Hash-based Client Router state (`activeRoute`, `setRoute`).
 * 3. Dynamic Permission Hook (`can(perm)`).
 * 4. Transaction API Facade (`apiCall(action, ...args)`).
 * 5. UI Feedback Controllers (Toast notifications, Dynamic Modals, Prompt dialogs).
 * 
 * @module AppContext
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Database, User, Permission } from '@/types';
import {
  loadStore,
  fetchServerStore,
  getDB,
  saveStore,
  baseDB,
  balances,
  holdings,
  statusOf,
  activeParts,
  isIssuable,
  seed,
} from '@/lib/store';
import { API, currentUser, signIn, signOut as authSignOut, hasPerm } from '@/lib/ops';
import { authClient } from '@/lib/auth-client';

interface ToastItem {
  id: string;
  msg: string;
  type: 'ok' | 'error';
}

export interface ModalOptions {
  title: string;
  size?: 'wide' | 'narrow' | '';
  headExtra?: ReactNode;
  body: ReactNode;
  foot?: ReactNode;
}

/**
 * Global App Context Contract containing application state and methods.
 */
interface AppContextType {
  db: Database;
  user: User | null;
  activeRoute: string;
  toasts: ToastItem[];
  modal: ModalOptions | null;
  askModal: {
    title: string;
    msg: string;
    okLabel?: string;
    danger?: boolean;
    withInput?: string;
    resolve: (val: string | boolean | null) => void;
  } | null;
  setRoute: (route: string) => void;
  refresh: () => void;
  login: (username: string, pw: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: Permission) => boolean;
  apiCall: (action: any, ...args: any[]) => any;
  showToast: (msg: string, type?: 'ok' | 'error') => void;
  openModal: (options: ModalOptions) => void;
  closeModal: () => void;
  ask: (
    title: string,
    msg: string,
    okLabel?: string,
    danger?: boolean,
    withInput?: string
  ) => Promise<string | boolean | null>;
  openCount: () => number;
}

const AppContext = createContext<AppContextType | null>(null);


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [db, setDbState] = useState<Database>(baseDB());
  const [user, setUser] = useState<User | null>(null);
  const [activeRoute, setActiveRouteState] = useState<string>('dashboard');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [askModal, setAskModal] = useState<any | null>(null);

  const refresh = () => {
    const loadedDb = loadStore();
    setDbState({ ...loadedDb });
    const curr = currentUser(loadedDb);
    setUser(curr ? { ...curr } : null);
  };

  useEffect(() => {
    refresh();
    fetchServerStore().then((serverDb) => {
      if (serverDb) {
        setDbState({ ...serverDb });
        const curr = currentUser(serverDb);
        setUser(curr ? { ...curr } : null);
      }
    });

    console.log('[BETTER_AUTH] Verifying authentication session token from server...');
    authClient.getSession().then((sessionRes) => {
      if (sessionRes.data?.user) {
        console.log('[BETTER_AUTH] Session active! User & Session payload received:', {
          user: sessionRes.data.user,
          session: sessionRes.data.session,
        });
      } else {
        console.log('[BETTER_AUTH] No active session cookie found. Login required.');
      }
    }).catch(err => {
      console.warn('[BETTER_AUTH] Error verifying session:', err);
    });

    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (hash) setActiveRouteState(hash);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);

    return () => {
      window.removeEventListener('hashchange', handleHash);
    };
  }, []);

  const setRoute = (r: string) => {
    setActiveRouteState(r);
  };

  const login = async (username: string, pw: string) => {
    const cleanUsername = String(username || '').trim().toLowerCase();
    console.log('[BETTER_AUTH] Initiating authentication request for username/email:', cleanUsername);

    const isEmail = cleanUsername.includes('@');
    let authRes: any;

    if (isEmail) {
      authRes = await authClient.signIn.email({
        email: cleanUsername,
        password: pw,
      });
    } else {
      authRes = await authClient.signIn.username({
        username: cleanUsername,
        password: pw,
      });
    }

    if (authRes?.error) {
      console.error('[BETTER_AUTH] Authentication failed:', authRes.error);
      throw new Error(authRes.error.message || 'Incorrect username or password.');
    }

    console.log('[BETTER_AUTH] Authentication SUCCESSFUL!', {
      user: authRes?.data?.user,
      sessionToken: authRes?.data?.token || 'HTTP-Only Session Cookie Issued (better-auth.session_token)',
      timestamp: new Date().toISOString(),
    });

    signIn(username, pw);
    refresh();
  };

  const logout = async () => {
    console.log('[BETTER_AUTH] Destroying session token and logging out...');
    try {
      await authClient.signOut();
      console.log('[BETTER_AUTH] Session destroyed on server & cookies cleared.');
    } catch (err) {
      console.warn('[BETTER_AUTH] Sign-out warning:', err);
    }
    authSignOut(false);
    setUser(null);
    setModal(null);
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
    refresh();
  };

  const can = (perm: Permission): boolean => {
    if (!user) return false;
    return hasPerm(user, perm);
  };

  const apiCall = (action: any, ...args: any[]) => {
    const res = API.call(action, ...args);
    refresh();
    return res;
  };

  const showToast = (msg: string, type: 'ok' | 'error' = 'ok') => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
      type === 'error' ? 5200 : 3200
    );
  };

  const openModal = (options: ModalOptions) => {
    setModal(options);
  };

  const closeModal = () => {
    setModal(null);
  };

  const ask = (
    title: string,
    msg: string,
    okLabel = 'Confirm',
    danger = false,
    withInput?: string
  ): Promise<string | boolean | null> => {
    return new Promise((resolve) => {
      setAskModal({
        title,
        msg,
        okLabel,
        danger,
        withInput,
        resolve: (val: string | boolean | null) => {
          setAskModal(null);
          resolve(val);
        },
      });
    });
  };

  const openCount = (): number => {
    let rs = db.requests.filter(
      (r) => isIssuable(r, db) || r.status === 'Requested'
    );
    if (user && user.role === 'sales_rep') {
      rs = rs.filter(
        (r) => r.requestedById === user.id || r.createdById === user.id
      );
    }
    return rs.length;
  };

  return (
    <AppContext.Provider
      value={{
        db,
        user,
        activeRoute,
        toasts,
        modal,
        askModal,
        setRoute,
        refresh,
        login,
        logout,
        can,
        apiCall,
        showToast,
        openModal,
        closeModal,
        ask,
        openCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
