/**
 * @file src/types/index.ts
 * @description Master TypeScript Definitions for Jain Automobiles Stock Management System (GMA & Parts).
 * 
 * This file serves as the Single Source of Truth (SSOT) for domain data contracts, including:
 * 1. Role-Based Access Control (RBAC) roles and fine-grained system permissions.
 * 2. Inventory entities (Parts, Destinations, Ledger Movement Rows, Inward Stock GRNs).
 * 3. Workflow entities (Stock Requests, Delivery Challans, Audit Logs).
 * 4. Application state schemas (Database structure, Settings, User Sessions).
 * 
 * @module Types
 */

/**
 * System Operational Roles across the Dealership Hierarchy.
 * Determines UI tab visibility, action permissions, and pricing data masking.
 */
export type Role =
  | 'super_admin'       // System Owner: Full technical, operational, and database access
  | 'owner'             // Dealer Principal: Business authority, financial reporting & user management
  | 'sales_manager'     // Sales Supervisor: Showroom request approvals & valuation reports
  | 'service_manager'   // Service Supervisor: Workshop request approvals & chassis history
  | 'warehouse_manager' // Inventory Controller: Full stock control (In/Issue/Return/Adjust/Reversals)
  | 'stock_in'          // Stock-In Specialist: Inward GRN receipt & Part creation
  | 'storekeeper'       // Storekeeper: Stock issuer, Delivery Challan printer, Returns receiver
  | 'sales_rep'         // Sales Executive: Showroom demand creator for bikes & accessories
  | 'viewer';           // Read-only observation role (Prices hidden)

/**
 * Fine-Grained Permissions (17 discrete capabilities) enforced across UI and API layers.
 */
export type Permission =
  | 'view'                // Permission to view live stock & catalogue
  | 'see_value'           // Permission to view purchase costs, stock valuation, and profit margins
  | 'request_create'      // Permission to raise new stock requests
  | 'request_approve'     // Permission to approve or reject stock requests
  | 'issue'               // Permission to physically issue stock and generate Delivery Challans
  | 'stock_in'            // Permission to process inward goods received (GRN)
  | 'return'              // Permission to process stock returns back to warehouse
  | 'adjust'              // Permission to perform manual physical stock count adjustments
  | 'reverse'             // Permission to perform protected historical ledger reversals
  | 'parts_edit'          // Permission to create and update parts master catalogue
  | 'parts_deactivate'    // Permission to activate/deactivate part records
  | 'destinations_edit'   // Permission to add/edit destination bikes and workshop bays
  | 'reports'             // Permission to view ledger reports and stock movement analytics
  | 'export'              // Permission to export data sheets as CSV
  | 'users_manage'        // Permission to manage user accounts, roles, and password resets
  | 'audit_view'          // Permission to inspect immutable system audit trail
  | 'settings';           // Permission to modify dealership settings and re-seed database

/**
 * Metadata configuration for role descriptions and default permission sets.
 */
export interface RoleInfo {
  label: string;
  perms: Permission[] | '*';
  desc?: string;
}

/**
 * Destination categories representing physical/logical locations where issued stock resides.
 */
export type DestinationType =
  | 'customer_vehicle' // Customer bike being serviced or fitted
  | 'counter_sale'     // Direct OTC counter sales
  | 'display'          // Showroom display accessories / display bikes
  | 'department'       // Internal workshop or dealership department
  | 'offsite';         // External satellite godown or secondary storage

/**
 * Master Stock Movement Types driving the Double-Entry Dynamic Stock Calculation.
 * 
 * Dynamic Stock Equation: Stock(P, T) = Sum(qty of ledger rows where part_id = P and timestamp <= T)
 */
export type MovementType =
  | 'OPENING'   // Initial inventory opening balance (+Q)
  | 'IN'        // Inward stock received via GRN supplier invoice (+Q)
  | 'ISSUE'     // Stock issued out of warehouse to a destination (-Q)
  | 'RETURN'    // Unused stock returned from destination back to warehouse (+Q)
  | 'ADJUST'    // Manual stock count audit adjustment (+/-Q)
  | 'REVERSAL'; // Exact cryptographic/audit inverse of a target ledger row (-target.qty)

/**
 * Lifecycle states of a Stock Request from creation to final fulfillment.
 */
export type RequestStatus =
  | 'Requested'        // Newly submitted, awaiting approval or store issue
  | 'Approved'         // Approved by Manager, ready for Storekeeper to issue
  | 'Partially issued' // Partially fulfilled (some items issued, remainder pending)
  | 'Issued'           // Fully fulfilled; official Delivery Challan issued
  | 'Closed short'     // Closed manually before full quantity was issued
  | 'Rejected'         // Rejected by Manager with rejection remarks
  | 'Cancelled';       // Cancelled by creator before processing

/**
 * Live Inventory Stock Alert Statuses based on minQty / maxQty thresholds.
 */
export type StockStatus = 'out' | 'low' | 'over' | 'ok';

/**
 * System User Account Entity.
 */
export interface User {
  id: string;            // Primary Key (e.g. 'USR-101')
  code?: string;         // Employee ID Code
  name: string;          // Full display name
  username: string;      // Login credential username
  role: Role;            // Assigned operational role
  phone?: string;        // Contact phone number
  salt: string;          // Cryptographic password salt (SHA-256)
  hash: string;          // Hashed password string
  active: boolean;       // Active status boolean (inactive users cannot log in)
  deleted?: boolean;     // Soft-delete flag
  createdAt: number;     // Account creation timestamp (Epoch MS)
  lastLogin: number | null; // Last authenticated timestamp
}

/**
 * Master Part Catalogue Item Entity (GMA & Spare Parts).
 */
export interface Part {
  id: string;            // Unique Part ID (e.g. 'PRT-1001')
  partCode: string;      // Official Manufacturer Part Code (e.g. 'GMA-HLM-101')
  sku: string;           // Internal SKU / Barcode lookup ID
  name: string;          // Part description/title
  category: string;      // Part Category (e.g. 'Helmets', 'Protection', 'Engine Oil')
  model: string;         // Compatible Royal Enfield Bike Model (e.g. 'Classic 350', 'Himalayan 450')
  uom: string;           // Unit of Measure (e.g. 'Nos', 'Ltrs', 'Sets')
  rack: string;          // Warehouse Rack/Bin location identifier (e.g. 'A-01-02')
  purchasePrice: number; // Purchase cost price per unit (Restricted to see_value)
  sellingPrice: number;  // Retail selling price per unit
  gst: number;           // Applicable GST percentage (e.g. 18 or 28)
  minQty: number;        // Re-order threshold quantity for low-stock alerts
  maxQty: number;        // Over-stock alert threshold quantity
  barcode: string;       // EAN/UPC Barcode string
  description: string;   // Technical notes and specifications
  active: boolean;       // Active catalogue status
  createdAt: number;     // Registration timestamp
}

/**
 * Destination Entity representing bikes, bays, or offsite godowns.
 */
export interface Destination {
  id: string;            // Primary Key (e.g. 'DST-101')
  code?: string;         // Short reference code
  name: string;          // Destination display name (e.g. 'Classic 350 - Gunmetal Grey')
  type: DestinationType; // Destination classification
  note?: string;         // Customer or location notes
  active: boolean;       // Active status
}

/**
 * Master Immutable Stock Ledger Row Entity.
 * Represents every atomic movement of inventory in the dealership.
 */
export interface LedgerRow {
  id: string;                // Primary Key (e.g. 'LDG-10001')
  ts: number;                // Movement timestamp (Epoch MS)
  type: MovementType;        // Movement type (IN, ISSUE, RETURN, ADJUST, REVERSAL)
  partId: string;            // Target Part ID
  partCode: string;          // Part code snapshot
  partName: string;          // Part name snapshot
  qty: number;               // Delta quantity (+ positive for add, - negative for deduct)
  before: number;            // Stock quantity balance before this movement
  after: number;             // Stock quantity balance after this movement
  userId: string;            // ID of user executing movement
  userName: string;          // Display name snapshot of user
  userRole: string;          // Role snapshot of user
  destinationId: string | null; // Destination ID (null for warehouse IN/Opening)
  destinationName: string;   // Destination name snapshot
  chassis: string;           // Bike Chassis / Frame Number
  model: string;             // Bike Model name
  salesInvoice: string;      // Customer Sales Invoice Number
  supplierInvoice: string;   // Supplier Inward Invoice Number
  grnNo?: string;            // Goods Received Note number
  challanNo: string;         // Associated Delivery Challan Number
  requestNo: string;         // Associated Stock Request Number
  requestedBy: string;       // Name of person who requested stock
  issuedBy: string;          // Name of person who issued stock
  returnNo?: string;         // Associated Return Voucher Number
  adjustNo?: string;         // Associated Adjustment Voucher Number
  reason: string;            // Business reason / Adjustment note
  remarks: string;           // Additional comments
  reversesId: string | null; // ID of targeted row if this is a REVERSAL row
}

/**
 * Individual line item within a Stock Request.
 */
export interface RequestItem {
  partId: string;   // Requested Part ID
  partCode: string; // Part code snapshot
  partName: string; // Part name snapshot
  qty: number;      // Quantity requested
  issued: number;   // Quantity issued so far
}

/**
 * State Transition Audit Item for Stock Request History.
 */
export interface HistoryItem {
  ts: number;    // Timestamp
  by: string;    // Action performer name
  action: string;// Action description (e.g. "Approved by Sales Manager")
}

/**
 * Stock Request Entity for requesting parts for a specific destination/bike.
 */
export interface StockRequest {
  id: string;               // Primary Key (e.g. 'REQ-1001')
  no: string;               // Sequential Request Number (e.g. 'REQ-2026-001')
  ts: number;               // Creation timestamp
  status: RequestStatus;    // Current lifecycle status
  destinationId: string;   // Destination ID
  destinationName: string;  // Destination name snapshot
  destType: DestinationType;// Destination category
  chassis: string;          // Bike Chassis / Frame Number
  model: string;            // Bike Model
  salesInvoice: string;     // Sales Invoice reference
  customer: string;         // Customer Name
  items: RequestItem[];     // List of requested part lines
  remarks: string;          // Request notes
  requestedById: string;    // User ID of employee requesting parts
  requestedByName: string;  // User Name of requester
  createdById: string;      // User ID of user who typed request into system
  createdByName: string;    // User Name of creator
  approvedByName?: string;  // Approving manager's name
  history: HistoryItem[];   // State transition trail
  challans: string[];       // Array of generated Delivery Challan numbers
}

/**
 * Individual line item within a Delivery Challan.
 */
export interface ChallanItem {
  partId: string;
  partCode: string;
  partName: string;
  qty: number;
}

/**
 * Official Delivery Challan Document Entity generated upon stock issue.
 */
export interface Challan {
  no: string;              // Sequential Challan Number (e.g. 'DC-2026-001')
  ts: number;              // Issuance timestamp
  requestId: string;       // Originating Stock Request ID
  requestNo: string;       // Originating Stock Request Number
  destinationId: string;  // Destination ID
  destinationName: string; // Destination name snapshot
  destType: DestinationType;
  chassis: string;         // Chassis Number
  model: string;           // Bike Model
  salesInvoice: string;    // Sales Invoice reference
  customer: string;        // Customer Name
  items: ChallanItem[];    // Array of issued part lines
  requestedByName: string; // Requester Name
  issuedById: string;      // Storekeeper User ID
  issuedByName: string;    // Storekeeper User Name
  remarks: string;         // Issuance remarks
}

/**
 * Line item in an Inward Stock (GRN) shipment.
 */
export interface InwardLine {
  partId: string; // Part ID received
  qty: number;    // Quantity received
}

/**
 * Inward Goods Received Note (GRN) Shipment Document.
 */
export interface Inward {
  no: string;            // Sequential Inward Number (e.g. 'GRN-2026-001')
  ts: number;            // Receipt timestamp
  invoiceNo: string;     // RE / GMA Supplier Invoice Number
  invoiceDate: string;   // Invoice Date string
  supplier: string;      // Supplier name (e.g. 'Royal Enfield Corporate')
  lines: InwardLine[];   // Received part lines
  userId: string;        // Receiving user ID
  userName: string;      // Receiving user name
  remarks: string;       // GRN notes
}

/**
 * Immutable System Audit Log Entry.
 */
export interface AuditLog {
  id: string;        // Log Entry ID (e.g. 'AU-1001')
  ts: number;        // Timestamp
  userId: string;    // User ID
  userName: string;  // User Name
  role: string;      // Role label snapshot
  action: string;    // Executed action label (e.g. 'Stock In', 'Request Approved')
  detail: string;    // Detailed description of change
  entity: string;    // Target entity ID/Reference
}

/**
 * Dealership Global Settings & Workflow Configurations.
 */
export interface Settings {
  dealership: string;       // Dealership business name
  branch: string;           // Branch location name
  dealerCode: string;       // Royal Enfield Dealer Code
  approvalRequired: boolean;// If true, Storekeepers cannot issue stock until a Manager approves
  allowNegative: boolean;   // If false, prevents stock issuing if live stock would drop below zero
  sessionHours: number;     // User session timeout duration in hours
}

/**
 * Brute-force Login Protection Guard tracker per IP/Username.
 */
export interface LoginGuard {
  fails: number; // Consecutive failed login count
  until: number; // Lockout expiry timestamp
}

/**
 * Central Database State Schema stored in LocalStorage and synced with Neon Database.
 */
export interface Database {
  version: number;                         // Database schema version
  createdAt: number;                       // Initial seed timestamp
  settings: Settings;                      // Global dealership settings
  users: User[];                           // User accounts table
  parts: Part[];                           // Master parts catalogue table
  destinations: Destination[];             // Destination bikes & workshop bays table
  ledger: LedgerRow[];                     // Master immutable stock ledger table
  requests: StockRequest[];                // Stock requests table
  challans: Challan[];                     // Delivery challans table
  inwards: Inward[];                       // Inward stock GRNs table
  audit: AuditLog[];                       // Audit logs table
  counters: Record<string, number>;        // Auto-increment document number counters
  loginGuard: Record<string, LoginGuard>;  // Login lockout guard table
}

/**
 * Authenticated User Session Payload.
 */
export interface Session {
  userId: string; // Active logged-in User ID
  exp: number;    // Session expiration timestamp
}
