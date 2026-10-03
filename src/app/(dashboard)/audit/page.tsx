/**
 * @file src/app/(dashboard)/audit/page.tsx
 * @description Next.js App Router Page for `/audit`.
 * 
 * Renders system audit logs and action details view.
 */

'use client';

import React from 'react';
import { AuditView } from '@/components/Views/AuditView';
import { useApp } from '@/context/AppContext';
import { DashboardView } from '@/components/Views/DashboardView';
import { useRouter } from 'next/navigation';

export default function AuditPage() {
  const { can } = useApp();
  const router = useRouter();

  if (!can('audit_view')) {
    return <DashboardView onNewRequest={() => router.push('/requests')} />;
  }

  return <AuditView />;
}
