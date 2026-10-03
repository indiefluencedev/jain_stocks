/**
 * @file src/app/page.tsx
 * @description Main Single Page Application Router & Shell Component.
 * 
 * Functions as the central route controller for the entire application:
 * 1. Unauthenticated users are presented with the `LoginView`.
 * 2. Authenticated users are presented with the main application Shell (`Sidebar`, `Topbar`, `BottomNav`).
 * 3. Switches active view components dynamically according to `activeRoute` and permission rules (`can(perm)`).
 * 
 * @module AppShell
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Topbar } from '@/components/Layout/Topbar';
import { BottomNav } from '@/components/Layout/BottomNav';

import { LoginView } from '@/components/Views/LoginView';
import { DashboardView } from '@/components/Views/DashboardView';
import { InventoryView } from '@/components/Views/InventoryView';
import { StockInView } from '@/components/Views/StockInView';
import { RequestsView } from '@/components/Views/RequestsView';
import { ChallansView } from '@/components/Views/ChallansView';
import { ReturnsView } from '@/components/Views/ReturnsView';
import { DestinationsView } from '@/components/Views/DestinationsView';
import { LedgerView } from '@/components/Views/LedgerView';
import { ReportsView } from '@/components/Views/ReportsView';
import { UsersView } from '@/components/Views/UsersView';
import { AuditView } from '@/components/Views/AuditView';
import { SettingsView } from '@/components/Views/SettingsView';

/**
 * Main Single-Page Application Component.
 */
export default function Home() {
  const { user, activeRoute, setRoute, can } = useApp();
  const [stockInPrefillPartId, setStockInPrefillPartId] = useState<string | null>(null);

  // Unauthenticated guard: Render login screen if no user session exists
  if (!user) {
    return <LoginView />;
  }

  /** Resolves page title string for Topbar header based on active route key */
  const getRouteTitle = (key: string): string => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      inventory: 'Inventory',
      stockin: 'Stock In',
      requests: 'Requests & Issue',
      challans: 'Delivery Challans',
      returns: 'Returns & Adjustments',
      destinations: 'Destinations & Bikes',
      ledger: 'Stock Ledger',
      reports: 'Reports',
      users: 'Users',
      audit: 'Audit Log',
      settings: 'Settings & Data',
    };
    return titles[key] || 'Dashboard';
  };

  /** Dynamically selects the view component to render based on route key and authorization */
  const renderActiveView = () => {
    switch (activeRoute) {
      case 'dashboard':
        return (
          <DashboardView
            onNewRequest={(directIssue) => {
              setRoute('requests');
            }}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            onGoStockIn={(partId) => {
              setStockInPrefillPartId(partId);
              setRoute('stockin');
            }}
          />
        );
      case 'stockin':
        return can('stock_in') ? (
          <StockInView
            prefillPartId={stockInPrefillPartId}
            onClearPrefill={() => setStockInPrefillPartId(null)}
          />
        ) : (
          <DashboardView onNewRequest={() => setRoute('requests')} />
        );
      case 'requests':
        return <RequestsView />;
      case 'challans':
        return <ChallansView />;
      case 'returns':
        return <ReturnsView />;
      case 'destinations':
        return <DestinationsView />;
      case 'ledger':
        return can('reports') ? (
          <LedgerView />
        ) : (
          <DashboardView onNewRequest={() => setRoute('requests')} />
        );
      case 'reports':
        return can('reports') ? (
          <ReportsView />
        ) : (
          <DashboardView onNewRequest={() => setRoute('requests')} />
        );
      case 'users':
        return can('users_manage') ? (
          <UsersView />
        ) : (
          <DashboardView onNewRequest={() => setRoute('requests')} />
        );
      case 'audit':
        return can('audit_view') ? (
          <AuditView />
        ) : (
          <DashboardView onNewRequest={() => setRoute('requests')} />
        );
      case 'settings':
        return can('settings') ? (
          <SettingsView />
        ) : (
          <DashboardView onNewRequest={() => setRoute('requests')} />
        );
      default:
        return (
          <DashboardView
            onNewRequest={() => setRoute('requests')}
          />
        );
    }
  };

  return (
    <div className="shell">
      <Sidebar />

      <div className="main">
        <Topbar title={getRouteTitle(activeRoute)} />

        <main className="view" id="view">
          {renderActiveView()}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
