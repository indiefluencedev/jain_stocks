/**
 * @file src/lib/auth-rbac.ts
 * @description Role-Based Access Control (RBAC) Permission Matrix & Checking Functions.
 * 
 * This module defines fine-grained UI permission strings and maps them against all 9 dealership roles.
 * Used for component-level access control, route protection, and menu filtering.
 * 
 * @module AuthRBAC
 */

import { Role } from "@/types";

/**
 * Granular UI & Action Permissions.
 */
export type Permission =
  | "view_dashboard"     // Access to Dashboard Overview page
  | "view_inventory"     // Access to Inventory list and stock lookup
  | "manage_parts"       // Create and edit part catalogue details
  | "perform_stock_in"   // Execute Goods Received Note (GRN) stock-in
  | "create_request"     // Raise new stock requests
  | "approve_request"    // Approve or reject pending stock requests
  | "issue_request"      // Issue stock and create delivery challans
  | "return_stock"       // Receive returned parts back to store
  | "adjust_stock"       // Perform manual physical stock count adjustments
  | "view_challans"      // View and print Delivery Challans
  | "view_destinations"  // View list of destination bikes & workshop bays
  | "manage_destinations"// Add, edit, and deactivate destinations
  | "view_ledger"        // Inspect master stock ledger history
  | "view_reports"       // Access financial & inventory analytics reports
  | "manage_users"       // Manage user accounts, reset passwords, edit roles
  | "view_audit_logs"    // Access immutable system audit logs
  | "manage_settings";   // System configuration and database re-seeding

/**
 * Master Authorization Mapping linking each Role to allowed Permissions.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    "view_dashboard",
    "view_inventory",
    "manage_parts",
    "perform_stock_in",
    "create_request",
    "approve_request",
    "issue_request",
    "return_stock",
    "adjust_stock",
    "view_challans",
    "view_destinations",
    "manage_destinations",
    "view_ledger",
    "view_reports",
    "manage_users",
    "view_audit_logs",
    "manage_settings",
  ],
  owner: [
    "view_dashboard",
    "view_inventory",
    "manage_parts",
    "perform_stock_in",
    "create_request",
    "approve_request",
    "issue_request",
    "return_stock",
    "adjust_stock",
    "view_challans",
    "view_destinations",
    "manage_destinations",
    "view_ledger",
    "view_reports",
    "manage_users",
    "view_audit_logs",
  ],
  sales_manager: [
    "view_dashboard",
    "view_inventory",
    "manage_parts",
    "create_request",
    "approve_request",
    "issue_request",
    "view_challans",
    "view_destinations",
    "view_ledger",
    "view_reports",
  ],
  service_manager: [
    "view_dashboard",
    "view_inventory",
    "create_request",
    "return_stock",
    "view_challans",
    "view_destinations",
    "view_ledger",
  ],
  warehouse_manager: [
    "view_dashboard",
    "view_inventory",
    "manage_parts",
    "perform_stock_in",
    "approve_request",
    "issue_request",
    "return_stock",
    "adjust_stock",
    "view_challans",
    "view_destinations",
    "manage_destinations",
    "view_ledger",
  ],
  stock_in: [
    "view_dashboard",
    "view_inventory",
    "perform_stock_in",
  ],
  storekeeper: [
    "view_dashboard",
    "view_inventory",
    "approve_request",
    "issue_request",
    "return_stock",
    "view_challans",
    "view_destinations",
  ],
  sales_rep: [
    "view_dashboard",
    "view_inventory",
    "create_request",
    "view_challans",
  ],
  viewer: [
    "view_dashboard",
    "view_inventory",
    "view_ledger",
  ],
};

/**
 * Checks whether a specified role possesses a target permission.
 * 
 * @param role - The operational role of the active user.
 * @param permission - The target permission string to verify.
 * @returns `true` if authorized, otherwise `false`.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}
