/**
 * @file src/components/Layout/Sidebar.tsx
 * @description Dynamic Role-Based Navigation Sidebar Component.
 * 
 * Filters and renders navigation tabs based on the active user's role permissions (`can(perm)`).
 * Displays badge counters for pending requests requiring attention.
 * 
 * @module SidebarComponent
 */

'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter, usePathname } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { initials } from '@/lib/store';
import {
  LayoutGrid,
  Box,
  ArrowDownCircle,
  FileCheck,
  FileText,
  RotateCcw,
  Bike,
  List,
  BarChart3,
  Users,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react';
import { Permission } from '@/types';

/**
 * Navigation item specification contract.
 */
interface NavItem {
  key: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  group: 'Overview' | 'Operations' | 'Traceability' | 'Admin';
  perm?: Permission;       // Single required permission
  any?: Permission[];      // Array of permissions (matches if user has at least one)
}

/**
 * Dynamic Sidebar Navigation Component.
 * Automatically adapts tab visibility according to user role authorization.
 */
export const Sidebar: React.FC = () => {
  const { db, user, activeRoute, setRoute, logout, openCount, can } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  /** Master list of navigation routes with group and permission definitions */
  const NAV_ITEMS: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={20} />, group: 'Overview' },
    { key: 'inventory', label: 'Inventory', icon: <Box size={20} />, group: 'Overview' },
    { key: 'stockin', label: 'Stock In', icon: <ArrowDownCircle size={20} />, group: 'Operations', perm: 'stock_in' },
    { key: 'requests', label: 'Requests & Issue', shortLabel: 'Requests', icon: <FileCheck size={20} />, group: 'Operations', any: ['request_create', 'request_approve', 'issue'] },
    { key: 'challans', label: 'Delivery Challans', shortLabel: 'Challans', icon: <FileText size={20} />, group: 'Operations', any: ['issue', 'reports', 'request_approve'] },
    { key: 'returns', label: 'Returns & Adjustments', shortLabel: 'Returns', icon: <RotateCcw size={20} />, group: 'Operations', any: ['return', 'adjust'] },
    { key: 'destinations', label: 'Destinations & Bikes', shortLabel: 'Bikes', icon: <Bike size={20} />, group: 'Traceability' },
    { key: 'ledger', label: 'Stock Ledger', shortLabel: 'Ledger', icon: <List size={20} />, group: 'Traceability', perm: 'reports' },
    { key: 'reports', label: 'Reports', icon: <BarChart3 size={20} />, group: 'Traceability', perm: 'reports' },
    { key: 'users', label: 'Users', icon: <Users size={20} />, group: 'Admin', perm: 'users_manage' },
    { key: 'audit', label: 'Audit Log', shortLabel: 'Audit', icon: <Shield size={20} />, group: 'Admin', perm: 'audit_view' },
    { key: 'settings', label: 'Settings & Data', shortLabel: 'Settings', icon: <Settings size={20} />, group: 'Admin', perm: 'settings' },
  ];

  /** Evaluates if the active user is authorized to see a specific navigation item */
  const isAllowed = (item: NavItem) => {
    if (item.perm && !can(item.perm)) return false;
    if (item.any && !item.any.some((p) => can(p))) return false;
    return true;
  };

  const allowedItems = NAV_ITEMS.filter(isAllowed);

  let currentGroup = '';
  const renderedItems: React.ReactNode[] = [];

  allowedItems.forEach((item) => {
    if (item.group !== currentGroup) {
      currentGroup = item.group;
      renderedItems.push(
        <div key={`group-${currentGroup}`} className="nav-label">
          {currentGroup}
        </div>
      );
    }

    const oc = item.key === 'requests' ? openCount() : 0;
    const isActive = pathname.startsWith('/' + item.key) || (pathname === '/' && item.key === 'dashboard');

    renderedItems.push(
      <button
        key={item.key}
        className={isActive ? 'on' : ''}
        onClick={() => {
          setRoute(item.key);
          router.push('/' + item.key);
        }}
        title={item.label}
      >
        {item.icon}
        <span className="lbl">{item.shortLabel || item.label}</span>
        {oc > 0 && <span className="count">{oc}</span>}
      </button>
    );
  });

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">JA</div>
        <div className="brand-text">
          <div className="brand-name">JAIN AUTOMOBILES</div>
          <div className="brand-sub">GMA &amp; Parts Stock · {db.settings.branch}</div>
        </div>
      </div>

      <nav className="nav">{renderedItems}</nav>

      <div className="me" onClick={() => setRoute('users')} title="Account">
        <div className="avatar">{initials(user.name)}</div>
        <div className="me-info">
          <div className="n">{user.name}</div>
          <div className="r">{ROLES[user.role]?.label}</div>
        </div>
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            logout();
          }}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
