import { Role } from "@/types";

export type Permission =
  | "view_dashboard"
  | "view_inventory"
  | "manage_parts"
  | "perform_stock_in"
  | "create_request"
  | "approve_request"
  | "issue_request"
  | "return_stock"
  | "adjust_stock"
  | "view_challans"
  | "view_destinations"
  | "manage_destinations"
  | "view_ledger"
  | "view_reports"
  | "manage_users"
  | "view_audit_logs"
  | "manage_settings";

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

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}
