/**
 * @file src/lib/store.ts
 * @description Core State Management, Persistence, Dynamic Double-Entry Ledger Equations, and Seed Generator.
 * 
 * Key Responsibilities:
 * 1. Double-Entry Dynamic Stock Balance Equation: Stock(P, T) = Sum(qty of ledger rows where part_id = P)
 * 2. Destination Holding Balance Equation: Holding(D, P) = -Sum(qty of ledger rows where destination_id = D)
 * 3. Cache Invalidation & Synchronized LocalStorage + Neon DB Persistence (`saveStore`, `fetchServerStore`)
 * 4. Password hashing using PBKDF-style SHA-256 iterations
 * 5. Re-order status calculation (`statusOf`) & Sequential voucher counter incrementer (`nextNo`)
 * 
 * @module Store
 */

import { Database, User, Part, Destination, LedgerRow, StockRequest, Challan, Inward, AuditLog, StockStatus } from '@/types';
import { ROLES, SUPER_PW, DEMO_PW, STATUS_L } from './constants';

export const STORE_KEY = 'ja_stock_mvp_v2';
export const SESSION_KEY = 'ja_stock_session';

const DAY = 86400000;
let CLOCK: number | null = null;
export const now = (): number => CLOCK || Date.now();


export function randHex(n: number): string {
  const a = new Uint8Array(n);
  try {
    crypto.getRandomValues(a);
  } catch (e) {
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 256) | 0;
  }
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const SEED_UUID_MAP: Record<string, string> = {
  'US_SUPER': '10000000-0000-4000-8000-000000000001',
  'US_OWNER': '10000000-0000-4000-8000-000000000002',
  'US_SM':    '10000000-0000-4000-8000-000000000003',
  'US_SVM':   '10000000-0000-4000-8000-000000000004',
  'US_WH':    '10000000-0000-4000-8000-000000000005',
  'US_IN':    '10000000-0000-4000-8000-000000000006',
  'US_ST':    '10000000-0000-4000-8000-000000000007',
  'US_SR1':   '10000000-0000-4000-8000-000000000008',
  'US_SR2':   '10000000-0000-4000-8000-000000000009',
  'US_VW':    '10000000-0000-4000-8000-000000000010',

  'DS_CUST':    '20000000-0000-4000-8000-000000000001',
  'DS_COUNTER': '20000000-0000-4000-8000-000000000002',
  'DS_SWALL':   '20000000-0000-4000-8000-000000000003',
  'DS_SVWALL':  '20000000-0000-4000-8000-000000000004',
  'DS_DB1':     '20000000-0000-4000-8000-000000000005',
  'DS_DB2':     '20000000-0000-4000-8000-000000000006',
  'DS_WS':      '20000000-0000-4000-8000-000000000007',
  'DS_GD2':     '20000000-0000-4000-8000-000000000008',
};

export function toUUID(code: string): string {
  if (SEED_UUID_MAP[code]) return SEED_UUID_MAP[code];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) return code;
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `30000000-0000-4000-8000-${hex.padEnd(12, '0')}`;
}

export const uid = (p?: string): string => generateUUID();

export const fmtN = (n?: number | null): string =>
  Number(n || 0).toLocaleString('en-IN');

export const fmtINR = (n?: number | null): string =>
  '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');

export const fmtD = (ts?: number | null): string =>
  ts
    ? new Date(ts).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

export const fmtDT = (ts?: number | null): string =>
  ts
    ? new Date(ts).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

export const isoDate = (ts: number): string => {
  const d = new Date(ts);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};

export const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function ago(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : d + ' days ago';
}

export const sum = <T extends Record<string, any>>(arr: T[], key: keyof T): number =>
  arr.reduce((t, x) => t + (Number(x[key]) || 0), 0);

export const initials = (name?: string): string =>
  String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function sha256(str: string): string {
  const ascii = unescape(encodeURIComponent(str));
  const rr = (v: number, a: number) => (v >>> a) | (v << (32 - a));
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words: number[] = [];
  const bitLen = ascii.length * 8;
  const hash: number[] = (sha256 as any).h = (sha256 as any).h || [];
  const k: number[] = (sha256 as any).k = (sha256 as any).k || [];
  let pc = k.length;
  const isC: Record<number, number> = {};

  for (let c = 2; pc < 64; c++) {
    if (!isC[c]) {
      for (let i = 0; i < 313; i += c) isC[i] = c;
      hash[pc] = (Math.pow(c, 0.5) * maxWord) | 0;
      k[pc++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
    }
  }

  let s = ascii + '\x80';
  while (s.length % 64 - 56) s += '\x00';
  for (let i = 0; i < s.length; i++) {
    const j = s.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = (bitLen / maxWord) | 0;
  words[words.length] = bitLen;

  let currentHash = hash.slice(0, 8);
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const old = currentHash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = currentHash[0],
        e = currentHash[4];
      const t1 =
        currentHash[7] +
        (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) +
        ((e & currentHash[5]) ^ (~e & currentHash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) |
              0);
      const t2 =
        (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) +
        ((a & currentHash[1]) ^ (a & currentHash[2]) ^ (currentHash[1] & currentHash[2]));
      currentHash = [(t1 + t2) | 0].concat(currentHash);
      currentHash[4] = (currentHash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) currentHash[i] = (currentHash[i] + old[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (currentHash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function hashPw(pw: string, salt: string): string {
  let h = salt + '|' + pw;
  for (let i = 0; i < 300; i++) h = sha256(h + salt);
  return h;
}

export function baseDB(): Database {
  return {
    version: 1,
    createdAt: Date.now(),
    settings: {
      dealership: 'Jain Automobiles',
      branch: 'Hisar',
      dealerCode: '11614',
      approvalRequired: false,
      allowNegative: false,
      sessionHours: 10,
    },
    users: [],
    parts: [],
    destinations: [],
    ledger: [],
    requests: [],
    challans: [],
    inwards: [],
    audit: [],
    counters: {},
    loginGuard: {},
  };
}

let DB: Database = baseDB();
let _bal: Record<string, number> | null = null;
let _hold: Record<string, Record<string, number>> | null = null;

export function invalidateCache(): void {
  _bal = null;
  _hold = null;
}

export function readStore(): Database | null {
  if (typeof window === 'undefined') return null;
  try {
    const t = localStorage.getItem(STORE_KEY);
    return t ? JSON.parse(t) : null;
  } catch (e) {
    return null;
  }
}

export function saveStore(db: Database): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db }),
    }).catch((err) => console.error('Failed sync to Neon DB:', err));
  } catch (e) {}
}

export async function fetchServerStore(): Promise<Database | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const data = await res.json();
      if (data.db) {
        DB = data.db;
        invalidateCache();
        localStorage.setItem(STORE_KEY, JSON.stringify(data.db));
        return data.db;
      }
    }
  } catch (e) {
    console.error('Failed to fetch store from Neon server:', e);
  }
  return null;
}

export function getDB(): Database {
  return DB;
}

export function setDB(newDb: Database): void {
  DB = newDb;
  invalidateCache();
  saveStore(DB);
}

export function loadStore(): Database {
  const d = readStore();
  if (d && d.version === 1) {
    DB = d;
  } else {
    seed();
    saveStore(DB);
  }
  invalidateCache();
  return DB;
}


/**
 * Atomic Transaction Mutation Wrapper.
 * 
 * Provides ACID-like atomicity for database state updates.
 * Creates an in-memory snapshot before running the mutation callback `fn`.
 * If an error occurs during execution, it automatically rolls back state to the snapshot.
 * Upon success, it persists changes to LocalStorage & Neon PostgreSQL server, and invalidates cache.
 */
export function mutate<T>(fn: (db: Database) => T): T {
  const d = readStore();
  if (d) DB = d;
  invalidateCache();
  const snap = JSON.stringify(DB);
  try {
    const r = fn(DB);
    saveStore(DB);
    invalidateCache();
    return r;
  } catch (e) {
    DB = JSON.parse(snap);
    invalidateCache();
    throw e;
  }
}

/**
 * Master Dynamic Live Stock Equation.
 * 
 * Stock is NEVER stored as a static, mutable integer column.
 * Live stock for part `P` is dynamically calculated by summing all movement quantities `r.qty`
 * across the master immutable ledger:
 * Stock(P) = Sum(ledger.qty where partId == P)
 * 
 * @returns Hashmap of Part ID -> Dynamic Live Quantity
 */
export function balances(db: Database = DB): Record<string, number> {
  if (_bal && db === DB) return _bal;
  const b: Record<string, number> = {};
  for (const r of db.ledger) {
    b[r.partId] = (b[r.partId] || 0) + r.qty;
  }
  if (db === DB) _bal = b;
  return b;
}

/** Returns live stock quantity for a single part ID */
export const stockOf = (id: string, db: Database = DB): number =>
  balances(db)[id] || 0;

/**
 * Destination Stock Holding Equation.
 * 
 * Calculates parts currently held by specific Destination bikes, workshop bays, or offsite godowns:
 * Holding(Destination, Part) = -Sum(ledger.qty where destinationId == Destination and partId == Part)
 * 
 * Note: Since ISSUE movements store negative quantities (-Q) in the ledger,
 * negating the sum yields the positive quantity currently held at the destination.
 * 
 * @returns Map of Destination ID -> Map of Part ID -> Quantity Held
 */
export function holdings(
  db: Database = DB
): Record<string, Record<string, number>> {
  if (_hold && db === DB) return _hold;
  const h: Record<string, Record<string, number>> = {};
  for (const r of db.ledger) {
    if (!r.destinationId) continue;
    h[r.destinationId] = h[r.destinationId] || {};
    h[r.destinationId][r.partId] = (h[r.destinationId][r.partId] || 0) - r.qty;
  }
  if (db === DB) _hold = h;
  return h;
}

export const partById = (id: string, db: Database = DB): Part | undefined =>
  db.parts.find((p) => p.id === id || p.partCode === id || p.sku === id);

export const destById = (id: string, db: Database = DB): Destination | undefined =>
  db.destinations.find((d) => d.id === id || d.code === id);

export const reqById = (id: string, db: Database = DB): StockRequest | undefined =>
  db.requests.find((r) => r.id === id || r.no === id);

export const userById = (id: string, db: Database = DB): User | undefined =>
  db.users.find((u) => u.id === id || u.username === id || u.code === id);

export const activeParts = (db: Database = DB): Part[] =>
  db.parts.filter((p) => p.active !== false);

/**
 * Computes Stock Level Alert Status ('out' | 'low' | 'over' | 'ok') against minQty / maxQty threshold settings.
 */
export function statusOf(p: Part, q: number): StockStatus {
  if (q <= 0) return 'out';
  if (q <= (Number(p.minQty) || 0)) return 'low';
  if (Number(p.maxQty) && q > Number(p.maxQty)) return 'over';
  return 'ok';
}

export function reversedSet(db: Database = DB): Set<string> {
  return new Set(

    db.ledger.filter((r) => r.reversesId).map((r) => r.reversesId as string)
  );
}

export function isIssuable(r: StockRequest, db: Database = DB): boolean {
  return (
    r.status === 'Approved' ||
    r.status === 'Partially issued' ||
    (r.status === 'Requested' && !db.settings.approvalRequired)
  );
}

export function fyLabel(ts: number): string {
  const d = new Date(ts);
  let y = d.getFullYear();
  if (d.getMonth() < 3) y--;
  return y + '-' + String((y + 1) % 100).padStart(2, '0');
}

export function nextNo(kind: string, db: Database = DB): string {
  const fy = fyLabel(now());
  const key = kind + fy;
  db.counters[key] = (db.counters[key] || 0) + 1;
  const pre: Record<string, string> = {
    DC: 'JA/DC',
    REQ: 'REQ',
    RTN: 'RTN',
    ADJ: 'ADJ',
    GRN: 'GRN',
  };
  return (
    (pre[kind] || kind) +
    '/' +
    fy +
    '/' +
    String(db.counters[key]).padStart(4, '0')
  );
}

export function resolvePart(v: string, db: Database = DB): Part | null {
  if (!v) return null;
  v = v.trim();
  const code = v.split(' · ')[0].trim().toLowerCase();
  const act = activeParts(db);
  let p = act.find((x) => x.partCode.toLowerCase() === code);
  if (p) return p;
  p = act.find((x) => (x.sku || '').toLowerCase() === code && Boolean(code));
  if (p) return p;
  const m = act.filter((x) => x.name.toLowerCase() === v.toLowerCase());
  return m.length === 1 ? m[0] : null;
}

export function challanReturnable(
  challanNo: string,
  partId: string,
  db: Database = DB
): number {
  let n = 0;
  for (const r of db.ledger) {
    if (r.challanNo === challanNo && r.partId === partId && r.destinationId) {
      n -= r.qty;
    }
  }
  return n;
}

export function seed(): void {
  DB = baseDB();
  const mk = (
    userCode: string,
    name: string,
    username: string,
    role: any
  ): User => {
    return {
      id: toUUID(userCode),
      code: userCode,
      name,
      username,
      role,
      phone: '',
      active: true,
      deleted: false,
      createdAt: Date.now(),
      lastLogin: null,
    };
  };

  DB.users.push(mk('US_SUPER', 'Super Admin', 'superadmin', 'super_admin'));

  [
    ['DS_CUST', 'Customer vehicle', 'customer_vehicle'],
    ['DS_COUNTER', 'Counter sale', 'counter_sale'],
    ['DS_SWALL', 'Sales display wall', 'display'],
    ['DS_SVWALL', 'Service display wall', 'display'],
    ['DS_DB1', 'Display bike: Classic 350 (showroom)', 'display'],
    ['DS_DB2', 'Display bike: Himalayan 450 (showroom)', 'display'],
    ['DS_WS', 'Service workshop', 'department'],
    ['DS_GD2', 'Offsite storage: Godown 2', 'offsite'],
  ].forEach((d) =>
    DB.destinations.push({
      id: toUUID(d[0]),
      code: d[0],
      name: d[1],
      type: d[2] as any,
      note: '',
      active: true,
    })
  );

  const P: [
    code: string,
    name: string,
    cat: string,
    model: string,
    cost: number,
    sell: number,
    gst: number,
    min: number,
    max: number,
    rack: string,
    op: number
  ][] = [
    ['GMA-HLM-101', 'Open-face helmet, matt black', 'Helmets', 'Universal', 2100, 2850, 18, 3, 12, 'A-01', 8],
    ['GMA-HLM-114', 'Full-face helmet, gloss red', 'Helmets', 'Universal', 3300, 4400, 18, 2, 8, 'A-02', 3],
    ['GMA-GLV-210', 'Riding gloves, touring (L)', 'Riding gear', 'Universal', 1350, 1850, 18, 4, 15, 'B-04', 14],
    ['GMA-JKT-305', 'Riding jacket, textile (XL)', 'Riding gear', 'Universal', 5400, 7200, 18, 1, 6, 'B-01', 6],
    ['GMA-SEAT-C35', 'Touring seat, dual', 'Comfort', 'Classic 350', 3600, 4800, 28, 2, 8, 'C-02', 5],
    ['GMA-BR-C35', 'Pillion backrest, black', 'Comfort', 'Classic 350', 1750, 2350, 28, 3, 10, 'C-05', 9],
    ['GMA-EG-M35', 'Engine guard, black', 'Protection', 'Meteor 350', 2700, 3650, 28, 3, 10, 'D-01', 7],
    ['GMA-EG-H35', 'Engine guard, silver', 'Protection', 'Hunter 350', 2500, 3350, 28, 2, 8, 'D-02', 2],
    ['GMA-SG-HM4', 'Sump guard, aluminium', 'Protection', 'Himalayan 450', 3100, 4150, 28, 2, 6, 'D-05', 4],
    ['GMA-WS-M35', 'Touring windscreen, tall', 'Styling', 'Meteor 350', 2250, 3000, 28, 2, 8, 'E-01', 6],
    ['GMA-PR-HM4', 'Pannier rails, black', 'Luggage', 'Himalayan 450', 4400, 5900, 28, 1, 5, 'F-01', 3],
    ['GMA-SB-UNI', 'Saddle bag, 18 L waxed canvas', 'Luggage', 'Universal', 2600, 3500, 18, 2, 8, 'F-03', 5],
    ['GMA-TB-UNI', 'Tank bag, magnetic', 'Luggage', 'Universal', 1900, 2550, 18, 2, 8, 'F-04', 4],
    ['GMA-FL-LED', 'LED fog lamp kit', 'Electricals', 'Universal', 3800, 5100, 28, 2, 8, 'G-01', 5],
    ['GMA-USB-C2', 'USB charger, dual port', 'Electricals', 'Universal', 850, 1150, 28, 5, 20, 'G-03', 18],
    ['GMA-MR-BE6', 'Bar-end mirrors, pair', 'Styling', 'Interceptor 650', 2300, 3100, 28, 1, 6, 'E-04', 4],
    ['GMA-TP-C35', 'Tank pad, rubber', 'Styling', 'Classic 350', 450, 650, 28, 5, 20, 'E-06', 40],
    ['GMA-BC-UNI', 'Bike cover, all-weather', 'Care', 'Universal', 950, 1300, 18, 3, 12, 'H-01', 11],
    ['GMA-HB-C65', 'Handlebar brace', 'Styling', 'Continental GT 650', 1500, 2050, 28, 1, 4, 'E-08', 3],
    ['GMA-LG-B35', 'Leg guard, chrome', 'Protection', 'Bullet 350', 2200, 2950, 28, 2, 8, 'D-07', 6],
  ];

  P.forEach((r, i) => {
    const p: Part = {
      id: toUUID('PT_' + String(i + 1).padStart(2, '0')),
      partCode: r[0],
      sku: 'JA-' + String(1001 + i),
      name: r[1],
      category: r[2],
      model: r[3],
      uom: 'Nos',
      rack: r[9],
      purchasePrice: r[4],
      sellingPrice: r[5],
      gst: r[6],
      minQty: r[7],
      maxQty: r[8],
      barcode: '',
      description: '',
      active: true,
      createdAt: Date.now(),
    };
    DB.parts.push(p);
  });

  CLOCK = null;
  invalidateCache();
}

function auditLog(
  U: User | null,
  action: string,
  detail?: string,
  entity?: string
): void {
  DB.audit.push({
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

function postLedgerRow(
  U: User,
  partId: string,
  qty: number,
  type: any,
  extra?: Partial<LedgerRow>
): LedgerRow {
  const p = partById(partId, DB);
  if (!p) throw new Error('Unknown part');
  const before = stockOf(partId, DB);
  const after = before + qty;
  if (after < 0 && !DB.settings.allowNegative) {
    throw new Error(
      'Not enough stock for ' +
        p.partCode +
        ' (' +
        p.name +
        '). Available ' +
        before +
        ', needed ' +
        -qty +
        '.'
    );
  }
  const row: LedgerRow = Object.assign(
    {
      id: uid('MV'),
      ts: now(),
      type,
      partId,
      partCode: p.partCode,
      partName: p.name,
      qty,
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
      remarks: '',
      reversesId: null,
    },
    extra || {}
  );
  DB.ledger.push(row);
  balances(DB)[partId] = after;
  invalidateCache();
  return row;
}

export function rawStockIn(U: User, d: any): string {
  if (!String(d.invoiceNo || '').trim())
    throw new Error('Enter the Royal Enfield invoice number.');
  const lines = mergeLines(d.lines || []);
  if (!lines.length) throw new Error('Add at least one part with a quantity.');
  const grn = nextNo('GRN', DB);
  lines.forEach((l) =>
    postLedgerRow(U, l.partId, l.qty, 'IN', {
      supplierInvoice: d.invoiceNo.trim(),
      grnNo: grn,
      remarks: d.remarks || '',
      reason: 'Received from ' + (d.supplier || 'Royal Enfield'),
    })
  );
  DB.inwards.push({
    no: grn,
    ts: now(),
    invoiceNo: d.invoiceNo.trim(),
    invoiceDate: d.invoiceDate || '',
    supplier: d.supplier || '',
    lines,
    userId: U.id,
    userName: U.name,
    remarks: d.remarks || '',
  });
  auditLog(
    U,
    'Stock in',
    grn +
      ': invoice ' +
      d.invoiceNo +
      ', ' +
      lines.length +
      ' line(s), ' +
      sum(lines, 'qty') +
      ' unit(s)',
    grn
  );
  return grn;
}

export function rawCreateRequest(U: User, d: any): StockRequest {
  const dest = destById(d.destinationId, DB);
  if (!dest || dest.active === false)
    throw new Error('Choose where the stock is going.');
  validateRef(dest, d);
  const items = mergeLines(d.items || []);
  if (!items.length) throw new Error('Add at least one part with a quantity.');
  const rb = userById(d.requestedById, DB) || U;
  const r: StockRequest = {
    id: uid('RQ'),
    no: nextNo('REQ', DB),
    ts: now(),
    status: 'Requested',
    destinationId: dest.id,
    destinationName: dest.name,
    destType: dest.type,
    chassis: (d.chassis || '').toUpperCase().trim(),
    model: d.model || '',
    salesInvoice: (d.salesInvoice || '').trim(),
    customer: (d.customer || '').trim(),
    items: items.map((i) => {
      const p = partById(i.partId, DB)!;
      return {
        partId: i.partId,
        partCode: p.partCode,
        partName: p.name,
        qty: i.qty,
        issued: 0,
      };
    }),
    remarks: d.remarks || '',
    requestedById: rb.id,
    requestedByName: rb.name,
    createdById: U.id,
    createdByName: U.name,
    history: [
      {
        ts: now(),
        by: U.name,
        action:
          'Requested' + (rb.id !== U.id ? ' on behalf of ' + rb.name : ''),
      },
    ],
    challans: [],
  };
  DB.requests.push(r);
  auditLog(
    U,
    'Request created',
    r.no + ' to ' + dest.name + refText(r) + ', ' + items.length + ' line(s)',
    r.no
  );
  return r;
}

export function rawIssue(
  U: User,
  id: string,
  lines: any[],
  remarks?: string
): Challan {
  const r = reqById(id, DB);
  if (!r) throw new Error('Request not found.');
  if (!isIssuable(r, DB))
    throw new Error(
      DB.settings.approvalRequired && r.status === 'Requested'
        ? 'This request needs approval before it can be issued.'
        : 'This request cannot be issued in its current state.'
    );
  const mergedLines = mergeLines(lines || []);
  if (!mergedLines.length) throw new Error('Enter at least one quantity to issue.');
  const c: Challan = {
    no: nextNo('DC', DB),
    ts: now(),
    requestId: r.id,
    requestNo: r.no,
    destinationId: r.destinationId,
    destinationName: r.destinationName,
    destType: r.destType,
    chassis: r.chassis,
    model: r.model,
    salesInvoice: r.salesInvoice,
    customer: r.customer,
    items: [],
    requestedByName: r.requestedByName,
    issuedById: U.id,
    issuedByName: U.name,
    remarks: remarks || '',
  };
  for (const l of mergedLines) {
    const it = r.items.find((i) => i.partId === l.partId);
    if (!it) throw new Error('Part is not on this request.');
    const rem = it.qty - it.issued;
    if (l.qty > rem)
      throw new Error(
        it.partCode + ': only ' + rem + ' left to issue on this request.'
      );
    postLedgerRow(U, l.partId, -l.qty, 'ISSUE', {
      destinationId: r.destinationId,
      destinationName: r.destinationName,
      chassis: r.chassis,
      model: r.model,
      salesInvoice: r.salesInvoice,
      challanNo: c.no,
      requestNo: r.no,
      requestedBy: r.requestedByName,
      issuedBy: U.name,
      remarks: remarks || '',
    });
    it.issued += l.qty;
    c.items.push({
      partId: l.partId,
      partCode: it.partCode,
      partName: it.partName,
      qty: l.qty,
    });
  }
  r.status = r.items.every((i) => i.issued >= i.qty)
    ? 'Issued'
    : 'Partially issued';
  r.challans.push(c.no);
  r.history.push({
    ts: now(),
    by: U.name,
    action: 'Issued ' + sum(c.items, 'qty') + ' unit(s) on ' + c.no,
  });
  DB.challans.push(c);
  auditLog(
    U,
    'Stock issued',
    c.no +
      ' for ' +
      r.no +
      ' to ' +
      r.destinationName +
      refText(r) +
      ', ' +
      sum(c.items, 'qty') +
      ' unit(s)',
    c.no
  );
  return c;
}

export function rawReturnStock(U: User, d: any): string {
  const lines = mergeLines(d.lines || []);
  if (!lines.length) throw new Error('Enter at least one quantity to return.');
  if (!String(d.remarks || '').trim())
    throw new Error('Add a short note on why it came back.');
  let dest: Destination | undefined;
  let ch: Challan | undefined = undefined;
  if (d.mode === 'challan') {
    ch = DB.challans.find((c) => c.no === d.challanNo);
    if (!ch) throw new Error('Choose a challan.');
    dest = destById(ch.destinationId, DB);
  } else {
    dest = destById(d.destinationId, DB);
    if (!dest) throw new Error('Choose a destination.');
  }
  if (!dest) throw new Error('Destination not found.');
  const no = nextNo('RTN', DB);
  const hold = holdings(DB)[dest.id] || {};
  for (const l of lines) {
    const p = partById(l.partId, DB)!;
    const max = ch
      ? challanReturnable(ch.no, l.partId, DB)
      : hold[l.partId] || 0;
    if (l.qty > max)
      throw new Error(
        p.partCode +
          ': only ' +
          max +
          ' can be returned from ' +
          (ch ? ch.no : dest.name) +
          '.'
      );
    postLedgerRow(U, l.partId, l.qty, 'RETURN', {
      destinationId: dest.id,
      destinationName: dest.name,
      chassis: ch ? ch.chassis : '',
      model: ch ? ch.model : '',
      salesInvoice: ch ? ch.salesInvoice : '',
      challanNo: ch ? ch.no : '',
      returnNo: no,
      reason:
        d.condition === 'damaged'
          ? 'Returned damaged'
          : 'Returned in good condition',
      remarks: d.remarks,
    });
    if (d.condition === 'damaged') {
      postLedgerRow(U, l.partId, -l.qty, 'ADJUST', {
        returnNo: no,
        reason: 'Damaged on return, written off',
        remarks: d.remarks,
      });
    }
  }
  auditLog(
    U,
    'Stock returned',
    no +
      ' from ' +
      (ch ? ch.no + ' / ' : '') +
      dest.name +
      ', ' +
      sum(lines, 'qty') +
      ' unit(s), ' +
      (d.condition === 'damaged' ? 'damaged' : 'good'),
    no
  );
  return no;
}

export function rawAdjust(U: User, d: any): string {
  const p = partById(d.partId, DB);
  if (!p) throw new Error('Choose a part.');
  const q = parseInt(d.qty, 10);
  if (!q) throw new Error('Enter a quantity.');
  if (!String(d.remarks || '').trim())
    throw new Error('Remarks are required for every adjustment.');
  const no = nextNo('ADJ', DB);
  postLedgerRow(U, p.id, q, 'ADJUST', { adjustNo: no, reason: d.reason, remarks: d.remarks });
  auditLog(
    U,
    'Stock adjusted',
    no + ': ' + p.partCode + ' ' + (q > 0 ? '+' : '') + q + ' (' + d.reason + ')',
    no
  );
  return no;
}

function mergeLines(lines: any[]): { partId: string; qty: number }[] {
  const m: Record<string, number> = {};
  for (const l of lines) {
    const q = parseInt(l.qty, 10);
    if (!(q > 0)) continue;
    m[l.partId] = (m[l.partId] || 0) + q;
  }
  return Object.keys(m).map((k) => ({ partId: k, qty: m[k] }));
}

function validateRef(dest: Destination, d: any): void {
  const ch = (d.chassis || '').trim();
  const inv = (d.salesInvoice || '').trim();
  if (ch && ch.replace(/[^a-z0-9]/gi, '').length < 4)
    throw new Error('Chassis number needs at least the last 4 characters.');
  if (dest.type === 'customer_vehicle' && !ch && !inv)
    throw new Error(
      'For a customer vehicle, enter the chassis number (last 4 at least) or the sales invoice number.'
    );
  if (dest.type === 'counter_sale' && !inv)
    throw new Error('For a counter sale, the sales invoice number is required.');
}

function refText(o: { chassis?: string; salesInvoice?: string }): string {
  const a: string[] = [];
  if (o.chassis) a.push('Chassis ' + o.chassis);
  if (o.salesInvoice) a.push('Inv ' + o.salesInvoice);
  return a.length ? ' (' + a.join(', ') + ')' : '';
}
