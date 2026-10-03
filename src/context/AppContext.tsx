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
import { API, hasPerm } from '@/lib/ops';
import { useSession, signIn, signOut, use } from 'better-auth/react';

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
  login: (username: string, pw: string) => void;
  logout: () => void;
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
    const session = useSession();
    if (session.data) {
      // Update user from better-auth session
      setUser(session.data.user as User | null);
    } else {
      const curr = currentUser(loadedDb);
      setUser(curr ? { ...curr } : null);
    }
  };

  useEffect(() => {
    refresh();
    fetchServerStore().then((serverDb) => {
      if (serverDb) {
        setDbState({ ...serverDb });
        const session = useSession();
        if (session.data) {
          setUser(session.data.user as User | null);
        } else {
          const curr = currentUser(serverDb);
          setUser(curr ? { ...curr } : null);
        }
      }
    });

    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (hash) setActiveRouteState(hash);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);

    // Removed storage listener as it's handled by better-auth
    // const handleStorage = (e: StorageEvent) => {
    //   refresh();
    // };
    // window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      // window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setRoute = (r: string) => {
    setActiveRouteState(r);
    if (typeof window !== 'undefined') {
      window.location.hash = '#/' + r;
    }
  };

  const login = async (username: string, pw: string) => {
    await signIn({ email: username, password: pw });
    refresh();
  };

  const logout = () => {
    signOut();
    setUser(null);
    setModal(null);
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
    refresh();
  };

  const can = (perm: Permission): boolean => {
    const session = useSession();
    if (!session.data?.user) return false;
    return hasPerm(session.data.user as User, perm);
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
