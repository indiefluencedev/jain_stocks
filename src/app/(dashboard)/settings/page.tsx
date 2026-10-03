/**
 * @file src/app/(dashboard)/settings/page.tsx
 * @description Next.js App Router Page for `/settings`.
 * 
 * Renders system preferences and JSON data export controls.
 */

'use client';

import React from 'react';
import { SettingsView } from '@/components/Views/SettingsView';
import { useApp } from '@/context/AppContext';
import { DashboardView } from '@/components/Views/DashboardView';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { can } = useApp();
  const router = useRouter();

  if (!can('settings')) {
    return <DashboardView onNewRequest={() => router.push('/requests')} />;
  }

  return <SettingsView />;
}
