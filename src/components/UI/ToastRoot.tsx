/**
 * @file src/components/UI/ToastRoot.tsx
 * @description Global Toast Notification Host Component.
 * 
 * Subscribes to `AppContext` toasts array and renders floating success ('ok') and error ('error') feedback messages.
 * 
 * @module ToastRootComponent
 */

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';

/** Global Toast Container Component */
export const ToastRoot: React.FC = () => {
  const { toasts } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div id="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
};
