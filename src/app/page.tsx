/**
 * @file src/app/page.tsx
 * @description Root Application Page Component (`/`).
 * 
 * Renders DashboardLayout and DashboardView for root route `/`.
 * Unauthenticated users are presented with LoginView.
 * 
 * @module RootPage
 */

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { LoginView } from '@/components/Views/LoginView';
import DashboardLayout from '@/app/(dashboard)/layout';
import DashboardPage from '@/app/(dashboard)/dashboard/page';

export default function Home() {
  const { user } = useApp();

  if (!user) {
    return <LoginView />;
  }

  return (
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  );
}
