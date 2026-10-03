/**
 * @file src/components/Views/AuditView.tsx
 * @description System Audit Trail Inspection & Export View Component.
 * 
 * Features:
 * 1. Filterable list of all system audit logs (`db.audit`).
 * 2. Details per action: Timestamp, Performer Name, Role, Executed Action, Detail note.
 * 3. Export audit logs to CSV (`can('export')`).
 * 
 * @module AuditViewComponent
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { fmtDT } from '@/lib/store';
import { Table, Column } from '../UI/Table';
import { Badge } from '../UI/Badge';
import { Search, Download } from 'lucide-react';
import { AuditLog } from '@/types';

/** Audit Trail Inspection View Component */
export const AuditView: React.FC = () => {
  const { db, can } = useApp();

  const [q, setQ] = useState('');

  const rows = db.audit
    .slice()
    .reverse()
    .filter(
      (a) =>
        !q.trim() ||
        (a.userName + ' ' + a.action + ' ' + a.detail + ' ' + a.role)
          .toLowerCase()
          .includes(q.trim().toLowerCase())
    )
    .slice(0, 400);

  const columns: Column<AuditLog>[] = [
    { label: 'When', format: (v, a) => fmtDT(a.ts) },
    {
      label: 'Person',
      render: (a) => (
        <div>
          <div className="strong">{a.userName}</div>
          <div className="sub">{a.role}</div>
        </div>
      ),
    },
    {
      label: 'Action',
      render: (a) => {
        let color = 'gold';
        if (/fail|block|denied|revers|removed|deactiv/i.test(a.action)) color = 'red';
        else if (/sign/i.test(a.action)) color = 'muted';
        return <Badge text={a.action} color={color} />;
      },
    },
    {
      label: 'Detail',
      render: (a) => <span className="sub">{a.detail}</span>,
    },
  ];

  const exportCSV = () => {
    const cols = [
      { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
      { label: 'userName', k: 'userName' },
      { label: 'role', k: 'role' },
      { label: 'action', k: 'action' },
      { label: 'detail', k: 'detail' },
      { label: 'entity', k: 'entity' },
    ];

    const csvContent =
      '﻿' +
      [
        cols.map((c) => `"${c.label}"`).join(','),
        ...db.audit.map((r: any) =>
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
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
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
            placeholder="Search person, action or detail"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {can('export') && (
          <button className="btn" onClick={exportCSV}>
            <Download size={18} /> CSV
          </button>
        )}
      </div>

      <p className="hint">
        Every sign-in and every change, with who did it and when. Entries cannot be edited or deleted from the app.
      </p>

      <Table columns={columns} data={rows} emptyText="No audit entries match." />
    </div>
  );
};
