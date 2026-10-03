export type Role =
  | 'super_admin'
  | 'owner'
  | 'sales_manager'
  | 'service_manager'
  | 'warehouse_manager'
  | 'stock_in'
  | 'storekeeper'
  | 'sales_rep'
  | 'viewer';

export type Permission =
  | 'view'
  | 'see_value'
  | 'request_create'
  | 'request_approve'
  | 'issue'
  | 'stock_in'
  | 'return'
  | 'adjust'
  | 'reverse'
  | 'parts_edit'
  | 'parts_deactivate'
  | 'destinations_edit'
  | 'reports'
  | 'export'
  | 'users_manage'
  | 'audit_view'
  | 'settings';

export interface RoleInfo {
  label: string;
  perms: Permission[] | '*';
  desc?: string;
}

export type DestinationType =
  | 'customer_vehicle'
  | 'counter_sale'
  | 'display'
  | 'department'
  | 'offsite';

export type MovementType =
  | 'OPENING'
  | 'IN'
  | 'ISSUE'
  | 'RETURN'
  | 'ADJUST'
  | 'REVERSAL';

export type RequestStatus =
  | 'Requested'
  | 'Approved'
  | 'Partially issued'
  | 'Issued'
  | 'Closed short'
  | 'Rejected'
  | 'Cancelled';

export type StockStatus = 'out' | 'low' | 'over' | 'ok';

export interface User {
  id: string;
  code?: string;
  name: string;
  username: string;
  role: Role;
  phone?: string;
  salt: string;
  hash: string;
  active: boolean;
  deleted?: boolean;
  createdAt: number;
  lastLogin: number | null;
}

export interface Part {
  id: string;
  partCode: string;
  sku: string;
  name: string;
  category: string;
  model: string;
  uom: string;
  rack: string;
  purchasePrice: number;
  sellingPrice: number;
  gst: number;
  minQty: number;
  maxQty: number;
  barcode: string;
  description: string;
  active: boolean;
  createdAt: number;
}

export interface Destination {
  id: string;
  code?: string;
  name: string;
  type: DestinationType;
  note?: string;
  active: boolean;
}

export interface LedgerRow {
  id: string;
  ts: number;
  type: MovementType;
  partId: string;
  partCode: string;
  partName: string;
  qty: number;
  before: number;
  after: number;
  userId: string;
  userName: string;
  userRole: string;
  destinationId: string | null;
  destinationName: string;
  chassis: string;
  model: string;
  salesInvoice: string;
  supplierInvoice: string;
  grnNo?: string;
  challanNo: string;
  requestNo: string;
  requestedBy: string;
  issuedBy: string;
  returnNo?: string;
  adjustNo?: string;
  reason: string;
  remarks: string;
  reversesId: string | null;
}

export interface RequestItem {
  partId: string;
  partCode: string;
  partName: string;
  qty: number;
  issued: number;
}

export interface HistoryItem {
  ts: number;
  by: string;
  action: string;
}

export interface StockRequest {
  id: string;
  no: string;
  ts: number;
  status: RequestStatus;
  destinationId: string;
  destinationName: string;
  destType: DestinationType;
  chassis: string;
  model: string;
  salesInvoice: string;
  customer: string;
  items: RequestItem[];
  remarks: string;
  requestedById: string;
  requestedByName: string;
  createdById: string;
  createdByName: string;
  approvedByName?: string;
  history: HistoryItem[];
  challans: string[];
}

export interface ChallanItem {
  partId: string;
  partCode: string;
  partName: string;
  qty: number;
}

export interface Challan {
  no: string;
  ts: number;
  requestId: string;
  requestNo: string;
  destinationId: string;
  destinationName: string;
  destType: DestinationType;
  chassis: string;
  model: string;
  salesInvoice: string;
  customer: string;
  items: ChallanItem[];
  requestedByName: string;
  issuedById: string;
  issuedByName: string;
  remarks: string;
}

export interface InwardLine {
  partId: string;
  qty: number;
}

export interface Inward {
  no: string;
  ts: number;
  invoiceNo: string;
  invoiceDate: string;
  supplier: string;
  lines: InwardLine[];
  userId: string;
  userName: string;
  remarks: string;
}

export interface AuditLog {
  id: string;
  ts: number;
  userId: string;
  userName: string;
  role: string;
  action: string;
  detail: string;
  entity: string;
}

export interface Settings {
  dealership: string;
  branch: string;
  dealerCode: string;
  approvalRequired: boolean;
  allowNegative: boolean;
  sessionHours: number;
}

export interface LoginGuard {
  fails: number;
  until: number;
}

export interface Database {
  version: number;
  createdAt: number;
  settings: Settings;
  users: User[];
  parts: Part[];
  destinations: Destination[];
  ledger: LedgerRow[];
  requests: StockRequest[];
  challans: Challan[];
  inwards: Inward[];
  audit: AuditLog[];
  counters: Record<string, number>;
  loginGuard: Record<string, LoginGuard>;
}

export interface Session {
  userId: string;
  exp: number;
}
