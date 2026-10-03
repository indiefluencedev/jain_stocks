/**
 * @file src/app/(dashboard)/users/page.tsx
 * @description Next.js App Router Page for `/users`.
 * 
 * Renders role-based user management table and permission details.
 */

'use client';

import React from 'react';
import { UsersView } from '@/components/Views/UsersView';
import { useApp } from '@/context/AppContext';
import { DashboardView } from '@/components/Views/DashboardView';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const { can } = useApp();
  const router = useRouter();

  if (!can('users_manage')) {
    return <DashboardView onNewRequest={() => router.push('/requests')} />;
  }

  return <UsersView />;
}
