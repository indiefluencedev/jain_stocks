/**
 * @file src/lib/ops.ts
 * @description Master Operations API Layer & Transaction Controller.
 * 
 * Provides transactional methods for stock movements, audit logging, authorization enforcement, and CRUD updates:
 * 1. Authentication & Session Management (`signIn`, `signOut`, `currentUser`)
 * 2. Immutable Audit Trail Logging (`auditLog`)
 * 3. Inward Stock GRN Receiving (`rawStockIn`)
 * 4. Stock Request Creation & Approval State Transitions (`rawCreateRequest`, `approveRequest`, `rejectRequest`)
 * 5. Stock Issuance & Delivery Challan Generation (`rawIssue`)
 * 6. Returns & Stock Adjustments (`rawReturnStock`, `rawAdjust`)
 * 7. Protected Ledger Reversals (`reverseLedgerRow`)
 * 
 * @module Ops
 */

import {
  User,
  Part,
  Destination,
  LedgerRow,
  StockRequest,
  Challan,
  Inward,
  Permission,
  Role,
  Session,
} from '@/types';
import {
  getDB,
  mutate,
  partById,
  destById,
  reqById,
  userById,
  stockOf,
  holdings,
  nextNo,
  now,
  uid,
  randHex,
  hashPw,
  rawStockIn,
  rawCreateRequest,
  rawIssue,
  rawReturnStock,
  rawAdjust,
  challanReturnable,
  sum,
  SESSION_KEY,
  activeParts,
  seed,
  baseDB,
} from './store';
import { ROLES, DEST_TYPES, MV, ADJ_REASONS } from './constants';

/**
 * Checks whether a given user holds a specific permission according to their assigned role.
 */
export function hasPerm(U: User, p: Permission): boolean {
  const r = ROLES[U.role];
  return Boolean(r && (r.perms === '*' || r.perms.includes(p)));
}

/**
 * Records an entry into the immutable system Audit Trail.
 * Logged details include performer User ID, Name, Role, Action, Detail, and Entity reference.
 */
export function auditLog(
  U: User | null,
  action: string,
  detail?: string,
  entity?: string
): void {
  const db = getDB();
  db.audit.push({
    id: uid('AU'),
    ts: now(),
    userId: U ? U.id : '',
    userName: U ? U.name : '(unknown)',
    role: U ? (ROLES[U.role] || {}).label || '' : '',
    action,
    detail: detail || '',

    entity: entity || '',
  });
}

export const OPS = {
  stockIn(U: User, d: any): string {
    return rawStockIn(U, d);
  },

  createRequest(U: User, d: any): StockRequest {
    return rawCreateRequest(U, d);
  },

  approve(U: User, id: string): void {
    const r = reqById(id);
    if (!r || r.status !== 'Requested')
      throw new Error('Only a new request can be approved.');
    r.status = 'Approved';
    r.approvedByName = U.name;
    r.history.push({ ts: now(), by: U.name, action: 'Approved' });
    auditLog(U, 'Request approved', r.no, r.no);
  },

  reject(U: User, id: string, reason: string): void {
    const r = reqById(id);
    if (!r || !['Requested', 'Approved'].includes(r.status))
      throw new Error('This request can no longer be rejected.');
    if (!String(reason || '').trim())
      throw new Error('Give a reason for rejecting.');
    r.status = 'Rejected';
    r.history.push({ ts: now(), by: U.name, action: 'Rejected: ' + reason });
    auditLog(U, 'Request rejected', r.no + ': ' + reason, r.no);
  },

  cancel(U: User, id: string): void {
    const r = reqById(id);
    if (!r || !['Requested', 'Approved'].includes(r.status))
      throw new Error('Only requests with nothing issued can be cancelled.');
    if (
      r.createdById !== U.id &&
      r.requestedById !== U.id &&
      !hasPerm(U, 'request_approve') &&
      !hasPerm(U, 'issue')
    )
      throw new Error('You can only cancel your own requests.');
    r.status = 'Cancelled';
    r.history.push({ ts: now(), by: U.name, action: 'Cancelled' });
    auditLog(U, 'Request cancelled', r.no, r.no);
  },

  issue(U: User, id: string, lines: any[], remarks?: string): Challan {
    return rawIssue(U, id, lines, remarks);
  },

  closeShort(U: User, id: string): void {
    const r = reqById(id);
    if (!r || r.status !== 'Partially issued')
      throw new Error('Only a partially issued request can be closed short.');
    r.status = 'Closed short';
    r.history.push({
      ts: now(),
      by: U.name,
      action: 'Closed with balance not issued',
    });
    auditLog(U, 'Request closed short', r.no, r.no);
  },

  createAndIssue(
    U: User,
    d: any
  ): { request: StockRequest; challan: Challan | null } {
    if (!hasPerm(U, 'request_create'))
      throw new Error('You do not have permission to raise requests.');
    const r = OPS.createRequest(U, d);
    const db = getDB();
    if (db.settings.approvalRequired && !hasPerm(U, 'request_approve')) {
      return { request: r, challan: null };
    }
    if (db.settings.approvalRequired) {
      OPS.approve(U, r.id);
    }
    const c = OPS.issue(
      U,
      r.id,
      r.items.map((i) => ({ partId: i.partId, qty: i.qty })),
      d.remarks
    );
    return { request: r, challan: c };
  },

  returnStock(U: User, d: any): string {
    return rawReturnStock(U, d);
  },

  adjust(U: User, d: any): string {
    return rawAdjust(U, d);
  },

  reverse(U: User, rowId: string, reason: string): void {
    const db = getDB();
    const row = db.ledger.find((r) => r.id === rowId);
    if (!row) throw new Error('Entry not found.');
    if (row.type === 'REVERSAL')
      throw new Error(
        'A reversal cannot itself be reversed. Make an adjustment instead.'
      );
    const reversedIds = new Set(
      db.ledger.filter((r) => r.reversesId).map((r) => r.reversesId)
    );
    if (reversedIds.has(row.id))
      throw new Error('This entry has already been reversed.');
    if (!String(reason || '').trim())
      throw new Error('Give a reason for the reversal.');

    const p = partById(row.partId);
    if (!p) throw new Error('Unknown part');
    const before = stockOf(row.partId);
    const qty = -row.qty;
    const after = before + qty;
    if (after < 0 && !db.settings.allowNegative) {
      throw new Error(
        'Reversal would result in negative stock for ' + p.partCode + '.'
      );
    }

    const newRow: LedgerRow = {
      id: uid('MV'),
      ts: now(),
      type: 'REVERSAL',
      partId: row.partId,
      partCode: row.partCode,
      partName: row.partName,
      qty,
      before,
      after,
      userId: U.id,
      userName: U.name,
      userRole: (ROLES[U.role] || {}).label || '',
      destinationId: row.destinationId,
      destinationName: row.destinationName,
      chassis: row.chassis,
      model: row.model,
      salesInvoice: row.salesInvoice,
      supplierInvoice: row.supplierInvoice,
      challanNo: row.challanNo,
      requestNo: row.requestNo,
      requestedBy: row.requestedBy,
      issuedBy: row.issuedBy,
      reason: 'Reverses ' + MV[row.type][0] + ' of ' + row.ts,
      remarks: reason,
      reversesId: row.id,
    };
    db.ledger.push(newRow);
    auditLog(
      U,
      'Entry reversed',
      row.partCode +
        ' ' +
        MV[row.type][0] +
        ' ' +
        row.qty +
        ' from ' +
        row.ts +
        ': ' +
        reason,
      row.id
    );
  },

  savePart(U: User, d: any): Part {
    const db = getDB();
    const code = String(d.partCode || '').trim().toUpperCase();
    if (!code) throw new Error('Part code is required.');
    if (!String(d.name || '').trim()) throw new Error('Part name is required.');
    const dup = db.parts.find(
      (p) => p.partCode.toUpperCase() === code && p.id !== d.id
    );
    if (dup) throw new Error('Part code ' + code + ' already exists.');

    const fields = {
      partCode: code,
      sku: (d.sku || '').trim(),
      name: d.name.trim(),
      category: (d.category || '').trim() || 'General',
      model: d.model || 'Universal',
      uom: d.uom || 'Nos',
      rack: (d.rack || '').trim(),
      purchasePrice: +d.purchasePrice || 0,
      sellingPrice: +d.sellingPrice || 0,
      gst: +d.gst || 0,
      minQty: +d.minQty || 0,
      maxQty: +d.maxQty || 0,
      barcode: (d.barcode || '').trim(),
      description: (d.description || '').trim(),
    };

    if (d.id) {
      const p = partById(d.id);
      if (!p) throw new Error('Part not found.');
      Object.assign(p, fields);
      auditLog(U, 'Part edited', code + ' ' + fields.name, p.id);
      return p;
    }

    const p: Part = Object.assign(
      { id: uid('PT'), active: true, createdAt: now() },
      fields
    );
    db.parts.push(p);

    const oq = parseInt(d.openingQty, 10);
    if (oq > 0) {
      const before = 0;
      const after = oq;
      db.ledger.push({
        id: uid('MV'),
        ts: now(),
        type: 'OPENING',
        partId: p.id,
        partCode: p.partCode,
        partName: p.name,
        qty: oq,
        before,
        after,
        userId: U.id,
        userName: U.name,
        userRole: (ROLES[U.role] || {}).label || '',
        destinationId: null,
        destinationName: '',
        chassis: '',
        model: '',
        salesInvoice: '',
        supplierInvoice: '',
        challanNo: '',
        requestNo: '',
        requestedBy: '',
        issuedBy: '',
        reason: '',
        remarks: 'Opening stock on part creation',
        reversesId: null,
      });
    }

    auditLog(
      U,
      'Part created',
      code + ' ' + fields.name + (oq > 0 ? ', opening ' + oq : ''),
      p.id
    );
    return p;
  },

  setPartActive(U: User, id: string, active: boolean): void {
    const p = partById(id);
    if (!p) throw new Error('Part not found.');
    p.active = Boolean(active);
    auditLog(
      U,
      active ? 'Part reactivated' : 'Part deactivated',
      p.partCode + ' ' + p.name,
      p.id
    );
  },

  saveDestination(U: User, d: any): Destination {
    const db = getDB();
    if (!String(d.name || '').trim())
      throw new Error('Destination name is required.');
    if (!DEST_TYPES[d.type as keyof typeof DEST_TYPES])
      throw new Error('Choose a type.');

    if (d.id) {
      const x = destById(d.id);
      if (!x) throw new Error('Destination not found.');
      x.name = d.name.trim();
      x.type = d.type;
      x.note = d.note || '';
      auditLog(U, 'Destination edited', x.name, x.id);
      return x;
    }

    const x: Destination = {
      id: uid('DS'),
      name: d.name.trim(),
      type: d.type,
      note: d.note || '',
      active: true,
    };
    db.destinations.push(x);
    auditLog(U, 'Destination created', x.name, x.id);
    return x;
  },

  setDestinationActive(U: User, id: string, active: boolean): void {
    const x = destById(id);
    if (!x) throw new Error('Destination not found.');
    x.active = Boolean(active);
    auditLog(
      U,
      active ? 'Destination reactivated' : 'Destination deactivated',
      x.name,
      x.id
    );
  },

  saveUser(U: User, d: any): User {
    const db = getDB();
    const un = String(d.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(un))
      throw new Error('Username: 3 to 30 letters, numbers, dots or dashes.');
    if (!String(d.name || '').trim()) throw new Error('Name is required.');
    if (!ROLES[d.role as Role]) throw new Error('Choose a role.');
    if (d.role === 'super_admin' && U.role !== 'super_admin')
      throw new Error('Only a Super Admin can create another Super Admin.');
    if (db.users.find((x) => x.username === un && x.id !== d.id && !x.deleted))
      throw new Error('Username already in use.');

    if (d.id) {
      const x = userById(d.id);
      if (!x) throw new Error('User not found.');
      if (x.role === 'super_admin' && U.role !== 'super_admin')
        throw new Error('Only a Super Admin can edit a Super Admin.');
      if (x.id === U.id && d.role !== x.role)
        throw new Error('You cannot change your own role.');
      x.name = d.name.trim();
      x.username = un;
      x.role = d.role;
      x.phone = d.phone || '';
      auditLog(
        U,
        'User edited',
        x.name + ' (' + ROLES[x.role].label + ')',
        x.id
      );
      return x;
    }

    if (String(d.password || '').length < 8)
      throw new Error('Password must be at least 8 characters.');
    const salt = randHex(16);
    const x: User = {
      id: uid('US'),
      name: d.name.trim(),
      username: un,
      role: d.role,
      phone: d.phone || '',
      salt,
      hash: hashPw(d.password, salt),
      active: true,
      deleted: false,
      createdAt: now(),
      lastLogin: null,
    };
    db.users.push(x);
    auditLog(
      U,
      'User created',
      x.name + ' (' + ROLES[x.role].label + ')',
      x.id
    );
    return x;
  },

  resetPassword(U: User, id: string, pw: string): void {
    const x = userById(id);
    if (!x) throw new Error('User not found.');
    if (String(pw || '').length < 8)
      throw new Error('Password must be at least 8 characters.');
    if (x.role === 'super_admin' && U.role !== 'super_admin')
      throw new Error('Only a Super Admin can reset a Super Admin password.');
    x.salt = randHex(16);
    x.hash = hashPw(pw, x.salt);
    auditLog(U, 'Password reset', x.name, x.id);
  },

  setUserActive(U: User, id: string, active: boolean): void {
    const x = userById(id);
    if (!x) throw new Error('User not found.');
    if (x.id === U.id) throw new Error('You cannot deactivate yourself.');
    if (x.role === 'super_admin' && U.role !== 'super_admin')
      throw new Error('Only a Super Admin can change a Super Admin.');
    x.active = Boolean(active);
    auditLog(
      U,
      active ? 'User activated' : 'User deactivated',
      x.name,
      x.id
    );
  },

  removeUser(U: User, id: string): void {
    const x = userById(id);
    if (!x) throw new Error('User not found.');
    if (x.id === U.id) throw new Error('You cannot remove yourself.');
    if (x.role === 'super_admin' && U.role !== 'super_admin')
      throw new Error('Only a Super Admin can remove a Super Admin.');
    x.deleted = true;
    x.active = false;
    auditLog(U, 'User removed', x.name + ' (history kept)', x.id);
  },

  changeOwnPassword(U: User, oldPw: string, newPw: string): void {
    const x = userById(U.id);
    if (!x) throw new Error('User not found.');
    if (x.hash !== hashPw(oldPw, x.salt))
      throw new Error('Current password is incorrect.');
    if (String(newPw || '').length < 8)
      throw new Error('New password must be at least 8 characters.');
    x.salt = randHex(16);
    x.hash = hashPw(newPw, x.salt);
    auditLog(U, 'Changed own password', '', x.id);
  },

  saveSettings(U: User, s: any): void {
    const db = getDB();
    Object.assign(db.settings, s);
    auditLog(
      U,
      'Settings changed',
      Object.entries(s)
        .map(([k, v]) => k + '=' + v)
        .join(', '),
      'settings'
    );
  },

  importParts(
    U: User,
    rows: any[]
  ): { created: number; skipped: number; units: number } {
    const db = getDB();
    let created = 0,
      skipped = 0,
      units = 0;
    for (const r of rows) {
      const code = String(r.part_code || '').trim().toUpperCase();
      if (!code || !String(r.name || '').trim()) {
        skipped++;
        continue;
      }
      if (db.parts.find((p) => p.partCode.toUpperCase() === code)) {
        skipped++;
        continue;
      }
      OPS.savePart(U, {
        partCode: code,
        name: r.name,
        category: r.category,
        model: r.model,
        sku: r.sku,
        uom: r.uom,
        rack: r.rack,
        purchasePrice: r.purchase_price,
        sellingPrice: r.selling_price,
        gst: r.gst,
        minQty: r.min_qty,
        maxQty: r.max_qty,
        openingQty: r.opening_qty,
      });
      created++;
      units += parseInt(r.opening_qty, 10) || 0;
    }
    auditLog(
      U,
      'Parts imported',
      created + ' created, ' + skipped + ' skipped, ' + units + ' opening units',
      'import'
    );
    return { created, skipped, units };
  },
};

export const PERM_FOR: Record<string, Permission> = {
  stockIn: 'stock_in',
  createRequest: 'request_create',
  approve: 'request_approve',
  reject: 'request_approve',
  issue: 'issue',
  closeShort: 'issue',
  createAndIssue: 'issue',
  returnStock: 'return',
  adjust: 'adjust',
  reverse: 'reverse',
  savePart: 'parts_edit',
  setPartActive: 'parts_deactivate',
  saveDestination: 'destinations_edit',
  setDestinationActive: 'destinations_edit',
  saveUser: 'users_manage',
  resetPassword: 'users_manage',
  setUserActive: 'users_manage',
  removeUser: 'users_manage',
  saveSettings: 'settings',
  importParts: 'settings',
};

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = sessionStorage.getItem(SESSION_KEY);
    if (!item) return null;
    const s: Session = JSON.parse(item);
    if (s && s.exp > Date.now()) return s;
  } catch (e) {}
  return null;
}

export function currentUser(db: any = getDB()): User | null {
  const s = getSession();
  if (!s) return null;
  const u = db.users.find(
    (x: User) => x.id === s.userId && x.active && !x.deleted
  );
  return u || null;
}

export function signIn(username: string, pw: string): User {
  const db = getDB();
  username = String(username || '').trim().toLowerCase();
  const g = db.loginGuard[username];
  if (g && g.until > Date.now()) {
    throw new Error(
      'Too many failed attempts. Try again in ' +
        Math.ceil((g.until - Date.now()) / 60000) +
        ' minute(s).'
    );
  }
  const U = db.users.find((u) => u.username === username && !u.deleted);
  const ok = U && U.hash === hashPw(pw, U.salt);

  if (!ok) {
    const gg = db.loginGuard[username] || { fails: 0, until: 0 };
    gg.fails++;
    let msg = 'Incorrect username or password.';
    if (gg.fails >= 5) {
      gg.until = Date.now() + 5 * 60000;
      gg.fails = 0;
      msg = 'Too many failed attempts. Sign-in locked for 5 minutes.';
    }
    db.loginGuard[username] = gg;
    auditLog(U || null, 'Sign-in failed', 'Username "' + username + '"', 'auth');
    throw new Error(msg);
  }

  if (!U.active) {
    auditLog(U, 'Sign-in blocked', 'Account deactivated', 'auth');
    throw new Error('This account has been deactivated. Contact the administrator.');
  }

  delete db.loginGuard[username];
  U.lastLogin = Date.now();
  auditLog(U, 'Signed in', '', 'auth');

  if (typeof window !== 'undefined') {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        userId: U.id,
        exp: Date.now() + (db.settings.sessionHours || 10) * 3600e3,
      })
    );
  }
  return U;
}

export function signOut(silent = false): void {
  if (typeof window === 'undefined') return;
  const db = getDB();
  const u = currentUser(db);
  if (u && !silent) {
    try {
      mutate(() => auditLog(u, 'Signed out', '', 'auth'));
    } catch (e) {}
  }
  sessionStorage.removeItem(SESSION_KEY);
}

export const API = {
  call<K extends keyof typeof OPS>(action: K, ...args: Parameters<(typeof OPS)[K]>): ReturnType<(typeof OPS)[K]> {
    const s = getSession();
    if (!s) {
      signOut(true);
      throw new Error('Your session has expired. Please sign in again.');
    }
    return mutate(() => {
      const db = getDB();
      const U = db.users.find(
        (u) => u.id === s.userId && u.active && !u.deleted
      );
      if (!U) throw new Error('Your account is no longer active.');
      const perm = PERM_FOR[action as string];
      if (perm && !hasPerm(U, perm)) {
        throw new Error('Your role does not allow this action.');
      }
      const fn = OPS[action] as any;
      return fn(U, ...args);
    });
  },
};
