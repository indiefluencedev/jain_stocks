/**
 * @file src/lib/constants.ts
 * @description System-wide constants, master role definitions, display labels, color maps, and bike model lists.
 * 
 * @module Constants
 */

import {
  Permission,
  Role,
  RoleInfo,
  DestinationType,
  MovementType,
  RequestStatus,
  StockStatus,
} from '@/types';

/**
 * Human-readable description labels for each of the 17 system permissions.
 * Used in User Management forms and UI role detail modals.
 */
export const PERMS: Record<Permission, string> = {
  view: 'View live stock and catalogue',
  see_value: 'See stock value and prices',
  request_create: 'Raise stock requests',
  request_approve: 'Approve or reject requests',
  issue: 'Issue stock and create challans',
  stock_in: 'Enter stock received',
  return: 'Process returns',
  adjust: 'Make stock adjustments',
  reverse: 'Reverse ledger entries',
  parts_edit: 'Add and edit parts',
  parts_deactivate: 'Deactivate parts',
  destinations_edit: 'Manage destinations',
  reports: 'View reports and ledger',
  export: 'Export CSV',
  users_manage: 'Manage users',
  audit_view: 'View audit log',
  settings: 'System settings and data',
};

/**
 * Master Role Configurations & Permission Arrays.
 * Matches the RBAC matrix enforced throughout the app.
 */
export const ROLES: Record<Role, RoleInfo> = {
  super_admin: {
    label: 'Super Admin',
    perms: '*',
    desc: 'Highest system authority with full administrative & database rights',
  },
  owner: {
    label: 'Owner',
    perms: '*',
    desc: 'Highest business authority with complete operational & financial rights',
  },
  sales_manager: {
    label: 'Sales Manager',
    perms: [
      'view',
      'see_value',
      'request_create',
      'request_approve',
      'reports',
      'export',
    ],
  },
  service_manager: {
    label: 'Service Manager',
    perms: [
      'view',
      'see_value',
      'request_create',
      'request_approve',
      'reports',
      'export',
    ],
  },
  warehouse_manager: {
    label: 'Warehouse Manager',
    perms: [
      'view',
      'see_value',
      'request_create',
      'request_approve',
      'issue',
      'stock_in',
      'return',
      'adjust',
      'parts_edit',
      'destinations_edit',
      'reports',
      'export',
    ],
  },
  stock_in: {
    label: 'Stock-In Person',
    perms: ['view', 'stock_in', 'parts_edit'],
  },
  storekeeper: {
    label: 'Storekeeper',
    perms: ['view', 'request_create', 'issue', 'return'],
  },
  sales_rep: {
    label: 'Sales Representative',
    perms: ['view', 'request_create'],
  },
  viewer: {
    label: 'Viewer',
    perms: ['view', 'reports'],
  },
};

/**
 * Royal Enfield Motorcycle Models supported in catalogue and destination tracking.
 */
export const MODELS: string[] = [
  'Universal',
  'Classic 350',
  'Bullet 350',
  'Hunter 350',
  'Meteor 350',
  'Goan Classic 350',
  'Himalayan 450',
  'Guerrilla 450',
  'Scram 440',
  'Interceptor 650',
  'Continental GT 650',
  'Super Meteor 650',
  'Shotgun 650',
  'Bear 650',
];

/**
 * Display labels for Destination Types.
 */
export const DEST_TYPES: Record<DestinationType, string> = {
  customer_vehicle: 'Customer vehicle',
  counter_sale: 'Counter sale',
  display: 'Display',
  department: 'Internal department',
  offsite: 'Offsite storage',
};

/**
 * Movement Type Visual Configurations: [Display Label, UI Badge Color, Icon Key].
 */
export const MV: Record<
  MovementType,
  [label: string, badgeColor: string, iconName: string]
> = {
  OPENING: ['Opening', 'blue', 'box'],
  IN: ['Stock in', 'green', 'in'],
  ISSUE: ['Issue', 'gold', 'out'],
  RETURN: ['Return', 'blue', 'undo'],
  ADJUST: ['Adjustment', 'amber', 'edit'],
  REVERSAL: ['Reversal', 'red', 'undo'],
};

/**
 * Request Status Badge Color Mapping.
 */
export const REQ_B: Record<RequestStatus, string> = {
  Requested: 'amber',
  Approved: 'blue',
  'Partially issued': 'gold',
  Issued: 'green',
  'Closed short': 'green',
  Rejected: 'red',
  Cancelled: 'muted',
};

/**
 * Stock Alert Level Configurations: [Display Label, UI Badge Color].
 */
export const STATUS_L: Record<StockStatus, [label: string, color: string]> = {
  out: ['Out of stock', 'red'],
  low: ['Low stock', 'amber'],
  over: ['Overstocked', 'blue'],
  ok: ['In stock', 'green'],
};

/**
 * Predefined Standard Reasons for Physical Inventory Stock Count Adjustments.
 */
export const ADJ_REASONS: string[] = [
  'Physical count correction',
  'Damaged in store',
  'Missing / lost',
  'Found in store',
  'Other',
];

/** Default password for operational test roles */
export const DEMO_PW = 'Demo@2026';

/** Default password for Super Admin account */
export const SUPER_PW = 'Jain@11614';
