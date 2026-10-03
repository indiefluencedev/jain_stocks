/**
 * @file src/components/Views/ReportsView.tsx
 * @description Reports, Financial Stock Valuation & Analytics View Component.
 * 
 * Features:
 * 1. Financial Stock Valuation Summary (`can('see_value')`).
 * 2. Category & Model-wise Inventory Breakdown.
 * 3. Dead Stock / Slow Moving Inventory Analysis.
 * 4. Fast Moving Parts Velocity Analysis.
 * 5. Destination Stock Holding Analytics.
 * 6. Exportable Data Sheets in CSV format.
 * 
 * @module ReportsViewComponent
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  activeParts,
  balances,
  statusOf,
  fmtINR,
  fmtDT,
  fmtD,
  startOfDay,
  isoDate,
  holdings,
  sum,
  partById,
  destById,
  userById,
} from '@/lib/store';
import { STATUS_L, MV, DEST_TYPES, ROLES } from '@/lib/constants';
import { Table, Column } from '../UI/Table';
import { Badge } from '../UI/Badge';
import { BarChart3, Download, ArrowLeft, Search } from 'lucide-react';

const DAY = 86400000;


export const ReportsView: React.FC = () => {
  const { db, can } = useApp();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState<string>(
    isoDate(Date.now() - 29 * DAY)
  );
  const [toDate, setToDate] = useState<string>(isoDate(Date.now()));
  const [chassisFilter, setChassisFilter] = useState<string>('');

  const bal = balances(db);
  const parts = activeParts(db);

  const runAnalytics = () => {
    const t = Date.now();
    const d30 = t - 30 * DAY;
    const d60 = t - 60 * DAY;
    const d90 = t - 90 * DAY;

    const rows = parts.map((p) => {
      let o30 = 0;
      let o90 = 0;
      let last = 0;

      for (const r of db.ledger) {
        if (r.partId !== p.id || r.type !== 'ISSUE') continue;
        const q = -r.qty;
        if (r.ts >= d30) o30 += q;
        if (r.ts >= d90) o90 += q;
        if (r.ts > last) last = r.ts;
      }

      const qty = bal[p.id] || 0;
      const daily = o90 / 90;
      const cover = daily > 0 ? Math.round(qty / daily) : null;
      return { p, qty, o30, o90, last, daily, cover };
    });

    const moving = rows.filter((r) => r.o30 > 0).map((r) => r.o30).sort((a, b) => b - a);
    const fastCut = Math.max(2, moving[Math.floor(moving.length / 4)] || 2);

    return rows.map((r) => {
      const p = r.p;
      let cls = 'No movement';
      if (r.qty > 0 && (!r.last || r.last < d60)) cls = 'Dead stock';
      else if (r.o30 >= fastCut) cls = 'Fast moving';
      else if (r.o90 > 0) cls = 'Slow moving';

      const over = Number(p.maxQty) > 0 && r.qty > Number(p.maxQty);
      let target = Math.max(p.minQty * 2, Math.ceil(r.daily * 45));
      if (Number(p.maxQty)) target = Math.min(target, Number(p.maxQty));
      const reorder = Math.max(0, target - r.qty);

      let action = '-';
      if (cls === 'Dead stock') action = 'Consider discount or return to RE';
      else if (over) action = 'Hold purchases, run an offer';
      else if (r.qty <= p.minQty) action = 'Reorder now';
      else if (reorder > 0 && cls === 'Fast moving') action = 'Plan reorder';

      return {
        ...r,
        cls,
        over,
        reorder,
        action,
      };
    });
  };

  const REPORTS = [
    {
      id: 'stock',
      t: 'Current stock',
      d: 'Live quantity, status and value for every active part.',
      run: () => {
        const cols: Column<any>[] = [
          { label: 'Part code', key: 'partCode' },
          { label: 'Name', key: 'name' },
          { label: 'Category', key: 'category' },
          { label: 'Model', key: 'model' },
          { label: 'Rack', key: 'rack' },
          { label: 'Qty', key: 'qty', num: true },
          { label: 'Min', key: 'minQty', num: true },
          { label: 'Max', key: 'maxQty', num: true },
          { label: 'Status', key: 'status' },
        ];

        if (can('see_value')) {
          cols.push({
            label: 'Cost value',
            key: 'cv',
            num: true,
            render: (r) => fmtINR(r.cv),
          });
          cols.push({
            label: 'Selling value',
            key: 'sv',
            num: true,
            render: (r) => fmtINR(r.sv),
          });
        }

        const rows = parts
          .map((p) => {
            const q = bal[p.id] || 0;
            return {
              ...p,
              qty: q,
              status: STATUS_L[statusOf(p, q)][0],
              cv: Math.max(q, 0) * p.purchasePrice,
              sv: Math.max(q, 0) * p.sellingPrice,
            };
          })
          .sort((a, b) => a.partCode.localeCompare(b.partCode));

        return { cols, rows };
      },
    },
    {
      id: 'low',
      t: 'Low and out of stock',
      d: 'Parts at or below their minimum level, with a suggested order quantity.',
      run: () => {
        const a = runAnalytics().filter((r) => r.qty <= r.p.minQty);
        const cols: Column<any>[] = [
          { label: 'Part code', render: (r) => r.p.partCode },
          { label: 'Name', render: (r) => r.p.name },
          { label: 'Rack', render: (r) => r.p.rack },
          { label: 'Qty', key: 'qty', num: true },
          { label: 'Min', num: true, render: (r) => r.p.minQty },
          { label: 'Issued last 30 days', key: 'o30', num: true },
          { label: 'Suggested order', key: 'reorder', num: true },
        ];
        return { cols, rows: a };
      },
    },
    {
      id: 'movement',
      t: 'Part movement',
      d: 'Opening, received, issued, returned, adjusted and closing stock for a period.',
      filters: 'range',
      run: () => {
        const from = startOfDay(new Date(fromDate).getTime());
        const to = startOfDay(new Date(toDate).getTime()) + DAY;

        const rows = parts
          .map((p) => {
            let op = 0;
            let inn = 0;
            let iss = 0;
            let ret = 0;
            let adj = 0;

            for (const r of db.ledger) {
              if (r.partId !== p.id) continue;
              if (r.ts < from) {
                op += r.qty;
                continue;
              }
              if (r.ts >= to) continue;
              if (r.type === 'IN' || r.type === 'OPENING') inn += r.qty;
              else if (r.type === 'ISSUE') iss -= r.qty;
              else if (r.type === 'RETURN') ret += r.qty;
              else adj += r.qty;
            }

            return {
              partCode: p.partCode,
              name: p.name,
              op,
              inn,
              iss,
              ret,
              adj,
              cl: op + inn - iss + ret + adj,
            };
          })
          .filter((r) => r.op || r.inn || r.iss || r.ret || r.adj || r.cl);

        const cols: Column<any>[] = [
          { label: 'Part code', key: 'partCode' },
          { label: 'Name', key: 'name' },
          { label: 'Opening', key: 'op', num: true },
          { label: 'Received', key: 'inn', num: true },
          { label: 'Issued', key: 'iss', num: true },
          { label: 'Returned', key: 'ret', num: true },
          { label: 'Adjusted', key: 'adj', num: true },
          { label: 'Closing', key: 'cl', num: true },
        ];
        return { cols, rows };
      },
    },
    {
      id: 'chassis',
      t: 'Bike / chassis usage',
      d: 'All parts fitted to each bike, with dates and the people involved.',
      filters: 'chassis',
      run: () => {
        const q = chassisFilter.trim().toUpperCase();
        const rows = db.ledger
          .filter(
            (r) =>
              r.chassis &&
              ['ISSUE', 'RETURN', 'REVERSAL'].includes(r.type) &&
              (!q || r.chassis.toUpperCase().includes(q))
          )
          .sort((a, b) => a.chassis.localeCompare(b.chassis) || a.ts - b.ts);

        const cols: Column<any>[] = [
          { label: 'Chassis', key: 'chassis' },
          { label: 'Model', key: 'model' },
          { label: 'Date', render: (r) => fmtDT(r.ts) },
          { label: 'Type', render: (r) => (MV as any)[r.type]?.[0] || r.type },
          { label: 'Part code', key: 'partCode' },
          { label: 'Part', key: 'partName' },
          { label: 'Qty', num: true, render: (r) => String(-r.qty) },
          { label: 'Challan', key: 'challanNo' },
          { label: 'Requested by', key: 'requestedBy' },
          { label: 'Issued by', key: 'userName' },
        ];
        return { cols, rows };
      },
    },
    {
      id: 'employee',
      t: 'Employee-wise',
      d: 'Requests raised, stock issued and stock received by each person.',
      run: () => {
        const rows = db.users
          .filter((u) => !u.deleted)
          .map((u) => {
            const reqs = db.requests.filter((r) => r.requestedById === u.id);
            let issued = 0;
            let received = 0;
            let adj = 0;
            for (const r of db.ledger) {
              if (r.userId !== u.id) continue;
              if (r.type === 'ISSUE') issued -= r.qty;
              if (r.type === 'IN') received += r.qty;
              if (r.type === 'ADJUST' || r.type === 'REVERSAL') adj++;
            }
            return {
              name: u.name,
              role: ROLES[u.role]?.label || u.role,
              req: reqs.length,
              reqUnits: reqs.reduce((a, r) => a + sum(r.items, 'issued'), 0),
              issued,
              received,
              adj,
            };
          })
          .filter((r) => r.req || r.issued || r.received || r.adj);

        const cols: Column<any>[] = [
          { label: 'Person', key: 'name' },
          { label: 'Role', key: 'role' },
          { label: 'Requests raised', key: 'req', num: true },
          { label: 'Units issued for their requests', key: 'reqUnits', num: true },
          { label: 'Units issued (as store)', key: 'issued', num: true },
          { label: 'Units received', key: 'received', num: true },
          { label: 'Adjustments / reversals', key: 'adj', num: true },
        ];
        return { cols, rows };
      },
    },
    {
      id: 'destination',
      t: 'Destination-wise',
      d: 'Stock issued to each destination, returned, and still held.',
      run: () => {
        const hMap = holdings(db);
        const rows = db.destinations.map((d) => {
          let iss = 0;
          let ret = 0;
          let last = 0;
          const ch = new Set<string>();
          for (const r of db.ledger) {
            if (r.destinationId !== d.id) continue;
            if (r.type === 'ISSUE') {
              iss -= r.qty;
              last = Math.max(last, r.ts);
              if (r.challanNo) ch.add(r.challanNo);
            } else if (r.type === 'RETURN') {
              ret += r.qty;
            }
          }
          const held = Object.values(hMap[d.id] || {}).reduce(
            (a, b) => a + Math.max(b, 0),
            0
          );
          return {
            name: d.name,
            type: DEST_TYPES[d.type],
            iss,
            ret,
            held,
            ch: ch.size,
            last,
          };
        });

        const cols: Column<any>[] = [
          { label: 'Destination', key: 'name' },
          { label: 'Type', key: 'type' },
          { label: 'Units issued', key: 'iss', num: true },
          { label: 'Units returned', key: 'ret', num: true },
          { label: 'Net held / fitted', key: 'held', num: true },
          { label: 'Challans', key: 'ch', num: true },
          { label: 'Last issue', render: (r) => (r.last ? fmtD(r.last) : '-') },
        ];
        return { cols, rows };
      },
    },
    {
      id: 'analytics',
      t: 'Movement analytics',
      d: 'Fast, slow and dead stock, overstock, discount candidates and suggested reorder.',
      run: () => {
        const order = ['Fast moving', 'Slow moving', 'No movement', 'Dead stock'];
        const rows = runAnalytics().sort(
          (a, b) =>
            order.indexOf(a.cls) - order.indexOf(b.cls) || b.o30 - a.o30
        );

        const cols: Column<any>[] = [
          { label: 'Part code', render: (r) => r.p.partCode },
          { label: 'Name', render: (r) => r.p.name },
          {
            label: 'Class',
            render: (r) => {
              const colorMap: Record<string, string> = {
                'Fast moving': 'green',
                'Slow moving': 'amber',
                'Dead stock': 'red',
                'No movement': 'muted',
              };
              return (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Badge text={r.cls} color={colorMap[r.cls] || 'muted'} />
                  {r.over && <Badge text="Overstock" color="blue" />}
                </div>
              );
            },
          },
          { label: 'In stock', key: 'qty', num: true },
          { label: 'Issued 30 d', key: 'o30', num: true },
          { label: 'Issued 90 d', key: 'o90', num: true },
          { label: 'Last issued', render: (r) => (r.last ? fmtD(r.last) : 'Never') },
          {
            label: 'Days of cover',
            num: true,
            render: (r) => (r.cover === null ? '-' : String(r.cover)),
          },
          { label: 'Suggested order', key: 'reorder', num: true },
          { label: 'Action', key: 'action' },
        ];
        return { cols, rows };
      },
    },
    {
      id: 'inward',
      t: 'Purchase records (RE invoices)',
      d: 'Every stock-in line against its Royal Enfield invoice.',
      run: () => {
        const rows = db.ledger
          .filter((r) => r.type === 'IN')
          .reverse()
          .map((r) => {
            const p = partById(r.partId, db);
            return {
              ...r,
              cost: r.qty * (p?.purchasePrice || 0),
            };
          });

        const cols: Column<any>[] = [
          { label: 'Date', render: (r) => fmtDT(r.ts) },
          { label: 'RE invoice', key: 'supplierInvoice' },
          { label: 'GRN', key: 'grnNo' },
          { label: 'Part code', key: 'partCode' },
          { label: 'Part', key: 'partName' },
          { label: 'Qty', key: 'qty', num: true },
        ];

        if (can('see_value')) {
          cols.push({
            label: 'Cost value',
            key: 'cost',
            num: true,
            render: (r) => fmtINR(r.cost),
          });
        }

        cols.push({ label: 'Entered by', key: 'userName' });

        return { cols, rows };
      },
    },
  ];

  if (selectedReportId) {
    const reportDef = REPORTS.find((r) => r.id === selectedReportId);
    if (reportDef) {
      const { cols, rows } = reportDef.run();

      const exportCSV = () => {
        const header = cols.map((c) => `"${c.label}"`).join(',');
        const bodyRows = rows.map((r: any) =>
          cols
            .map((c) => {
              let val = c.key ? r[c.key] : '';
              if (val === undefined || val === null) val = '';
              return `"${String(val).replace(/"/g, '""')}"`;
            })
            .join(',')
        );
        const csvContent = '﻿' + [header, ...bodyRows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportDef.id}_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      return (
        <div>
          <div className="toolbar">
            <button className="btn ghost" onClick={() => setSelectedReportId(null)}>
              <ArrowLeft size={16} /> All reports
            </button>

            <h2 style={{ flex: 1, fontSize: '22px' }}>{reportDef.t}</h2>

            {reportDef.filters === 'range' && (
              <>
                <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  From
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </label>
                <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  To
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </label>
              </>
            )}

            {reportDef.filters === 'chassis' && (
              <div className="search">
                <Search size={18} className="ic" />
                <input
                  placeholder="Filter by chassis (optional)"
                  value={chassisFilter}
                  onChange={(e) => setChassisFilter(e.target.value)}
                />
              </div>
            )}

            {can('export') && (
              <button className="btn primary" onClick={exportCSV}>
                <Download size={18} /> Download CSV
              </button>
            )}
          </div>

          <p className="hint">
            {reportDef.d} {rows.length} row(s).
          </p>

          <Table columns={cols} data={rows} emptyText="No data for this report yet." />
        </div>
      );
    }
  }

  return (
    <div>
      <p className="hint">
        Every report opens on screen and downloads as a CSV that opens directly in Google Sheets or Excel.
      </p>

      <div className="cards">
        {REPORTS.map((r) => (
          <div key={r.id} className="card" onClick={() => setSelectedReportId(r.id)}>
            <h3>{r.t}</h3>
            <p>{r.d}</p>
            <div className="foot">
              <span className="sub">Open report</span>
              <BarChart3 size={20} color="var(--gold)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
