/**
 * @file src/app/(dashboard)/layout.tsx
 * @description Next.js App Router Dashboard Layout Shell Component.
 * 
 * Provides unified layout wrapper (`Sidebar`, `Topbar`, `BottomNav`) for all authenticated
 * dashboard pages under the `(dashboard)` route group.
 * 
 * @module DashboardLayout
 */

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Topbar } from '@/components/Layout/Topbar';
import { BottomNav } from '@/components/Layout/BottomNav';
import { LoginView } from '@/components/Views/LoginView';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  const pathname = usePathname();

  // If user session is loading or missing, render login view
  if (!user) {
    return <LoginView />;
  }

  /** Resolves page header title based on active URL pathname */
  const getRouteTitle = (path: string): string => {
    if (path.startsWith('/inventory')) return 'Inventory Catalog';
    if (path.startsWith('/stockin')) return 'Stock Inward Entry';
    if (path.startsWith('/requests')) return 'Requests & Issue';
    if (path.startsWith('/challans')) return 'Delivery Challans';
    if (path.startsWith('/inwards')) return 'GRN Stock Inward Invoices';
    if (path.startsWith('/returns')) return 'Returns & Adjustments';
    if (path.startsWith('/destinations')) return 'Destinations & Bikes';
    if (path.startsWith('/ledger')) return 'Master Stock Ledger';
    if (path.startsWith('/reports')) return 'Reports & Analytics';
    if (path.startsWith('/users')) return 'User Management';
    if (path.startsWith('/audit')) return 'System Audit Logs';
    if (path.startsWith('/settings')) return 'Settings & Data Export';
    return 'Dashboard';
  };

  return (
    <div className="shell">
      <Sidebar />

      <div className="main">
        <Topbar title={getRouteTitle(pathname)} />

        <main className="view" id="view">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
