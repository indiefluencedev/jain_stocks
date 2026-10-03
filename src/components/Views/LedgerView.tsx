'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { fmtDT, startOfDay, reversedSet } from '@/lib/store';
import { MV } from '@/lib/constants';
import { Table, Column } from '../UI/Table';
import { MovementBadge, Badge } from '../UI/Badge';
import { Search, Download, RotateCcw } from 'lucide-react';
import { LedgerRow } from '@/types';

const DAY = 86400000;

export const LedgerView: React.FC = () => {
  const { db, can, apiCall, showToast, ask } = useApp();

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fromTs = fromDate ? startOfDay(new Date(fromDate).getTime()) : 0;
  const toTs = toDate ? startOfDay(new Date(toDate).getTime()) + DAY : Infinity;

  const reversedIds = reversedSet(db);

  const filteredLedger = db.ledger
    .filter((r) => {
      if (type && r.type !== type) return false;
      if (r.ts < fromTs || r.ts >= toTs) return false;

      const queryStr = [
        r.partCode,
        r.partName,
        r.chassis,
        r.salesInvoice,
        r.supplierInvoice,
        r.challanNo,
        r.requestNo,
        r.userName,
        r.destinationName,
        r.requestedBy,
        r.remarks,
      ]
        .join(' ')
        .toLowerCase();

      if (q.trim() && !queryStr.includes(q.trim().toLowerCase())) return false;
      return true;
    })
    .reverse();

  const displayRows = filteredLedger.slice(0, 300);

  const handleReverse = async (row: LedgerRow) => {
    const reason = await ask(
      `Reverse entry for ${row.partCode}?`,
      `Reversing ${MV[row.type][0]} of ${row.qty} units from ${fmtDT(row.ts)}. This will append a reversal line to the ledger.`,
      'Reverse entry',
      true,
      'Reason for reversal'
    );

    if (reason && typeof reason === 'string') {
      try {
        apiCall('reverse', row.id, reason);
        showToast(`Entry reversed (${row.partCode})`);
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const columns: Column<LedgerRow>[] = [
    { label: 'When', format: (v, r) => fmtDT(r.ts) },
    {
      label: 'Type',
      render: (r) => (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <MovementBadge type={r.type} />
          {reversedIds.has(r.id) && <Badge text="Reversed" color="red" />}
        </div>
      ),
    },
    {
      label: 'Part',
      render: (r) => (
        <div>
          <div className="code">{r.partCode}</div>
          <div className="sub">{r.partName}</div>
        </div>
      ),
    },
    {
      label: 'Qty',
      num: true,
      render: (r) => (
        <span className={r.qty > 0 ? 'qpos' : 'qneg'}>
          {r.qty > 0 ? `+${r.qty}` : r.qty}
        </span>
      ),
    },
    {
      label: 'Stock',
      num: true,
      render: (r) => (
        <span>
          <span className="sub">{r.before} → </span>
          <b>{r.after}</b>
        </span>
      ),
    },
    {
      label: 'Reference',
      render: (r) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          {r.challanNo && <span className="chip">{r.challanNo}</span>}
          {r.chassis && <span className="chip">Chassis {r.chassis}</span>}
          {r.salesInvoice && <span className="chip">Inv {r.salesInvoice}</span>}
          {r.supplierInvoice && <span className="chip">RE {r.supplierInvoice}</span>}
          {r.destinationName && <span className="sub">{r.destinationName}</span>}
          {r.reason && r.type !== 'IN' && <span className="sub">{r.reason}</span>}
        </div>
      ),
    },
    {
      label: 'By',
      render: (r) => (
        <div>
          {r.userName}
          {r.requestedBy && r.type === 'ISSUE' && (
            <div className="sub">for {r.requestedBy}</div>
          )}
        </div>
      ),
    },
    {
      label: 'Remarks',
      render: (r) => <span className="sub">{r.remarks || '-'}</span>,
    },
  ];

  if (can('reverse')) {
    columns.push({
      label: '',
      cls: 'actions',
      render: (r) =>
        r.type !== 'REVERSAL' && !reversedIds.has(r.id) ? (
          <button
            className="btn sm ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleReverse(r);
            }}
          >
            Reverse
          </button>
        ) : null,
    });
  }

  const exportCSV = () => {
    const cols = [
      { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
      { label: 'type', k: 'type' },
      { label: 'partCode', k: 'partCode' },
      { label: 'partName', k: 'partName' },
      { label: 'qty', k: 'qty' },
      { label: 'before', k: 'before' },
      { label: 'after', k: 'after' },
      { label: 'destinationName', k: 'destinationName' },
      { label: 'chassis', k: 'chassis' },
      { label: 'model', k: 'model' },
      { label: 'salesInvoice', k: 'salesInvoice' },
      { label: 'supplierInvoice', k: 'supplierInvoice' },
      { label: 'challanNo', k: 'challanNo' },
      { label: 'requestNo', k: 'requestNo' },
      { label: 'requestedBy', k: 'requestedBy' },
      { label: 'issuedBy', k: 'issuedBy' },
      { label: 'userName', k: 'userName' },
      { label: 'userRole', k: 'userRole' },
      { label: 'reason', k: 'reason' },
      { label: 'remarks', k: 'remarks' },
      { label: 'reversesId', k: 'reversesId' },
      { label: 'id', k: 'id' },
    ];

    const csvContent =
      '﻿' +
      [
        cols.map((c) => `"${c.label}"`).join(','),
        ...filteredLedger.map((r: any) =>
          cols
            .map((c) => {
              const val = c.format ? c.format(r[c.k]) : r[c.k];
              return `"${val ?? ''}"`;
            })
            .join(',')
        ),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search">
          <Search size={18} className="ic" />
          <input
            placeholder="Search part, chassis, invoice, challan or person"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(MV).map(([k, info]) => (
            <option key={k} value={k}>
              {info[0]}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="From date"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="To date"
        />

        {can('export') && (
          <button className="btn" onClick={exportCSV}>
            <Download size={18} /> CSV
          </button>
        )}
      </div>

      <p className="hint">
        Every stock change is a permanent line here. Mistakes are fixed with a reversal line, never by editing or deleting.
      </p>

      <p className="sub" style={{ margin: '0 0 10px' }}>
        {filteredLedger.length} entr{filteredLedger.length === 1 ? 'y' : 'ies'}
        {filteredLedger.length > 300 ? ', showing latest 300 (export CSV for all)' : ''}
      </p>

      <Table
        columns={columns}
        data={displayRows}
        emptyText="No ledger entries match."
      />
    </div>
  );
};
