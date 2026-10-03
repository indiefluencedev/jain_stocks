/**
 * @file src/components/Views/SettingsView.tsx
 * @description System Settings & Data Operations View Component.
 * 
 * Features:
 * 1. Dealership Settings (Branch Name, Dealer Code, Approval Required Toggle, Session Timeout).
 * 2. Database Backup & Restore (JSON Export / Import).
 * 3. Database Re-seeding (`seed()`) and Factory Reset.
 * 4. Sample CSV Data Generator for Parts, Users, and Stock Movements.
 * 
 * @module SettingsViewComponent
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  setDB,
  saveStore,
  baseDB,
  seed,
  activeParts,
  balances,
  statusOf,
  fmtDT,
  userById,
  invalidateCache,
} from '@/lib/store';
import { STATUS_L, ROLES } from '@/lib/constants';
import { Download, Upload, Sheet, Check, RefreshCw, Trash2 } from 'lucide-react';
import { Database } from '@/types';

/** System Settings & Data Tools View Component */
export const SettingsView: React.FC = () => {
  const { db, user, apiCall, showToast, refresh, ask } = useApp();


  const [approvalRequired, setApprovalRequired] = useState(
    db.settings.approvalRequired
  );
  const [allowNegative, setAllowNegative] = useState(
    db.settings.allowNegative
  );
  const [dealership, setDealership] = useState(db.settings.dealership);
  const [branch, setBranch] = useState(db.settings.branch);
  const [dealerCode, setDealerCode] = useState(db.settings.dealerCode);
  const [sessionHours, setSessionHours] = useState(db.settings.sessionHours);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      apiCall('saveSettings', {
        approvalRequired,
        allowNegative,
        dealership: dealership.trim() || 'Jain Automobiles',
        branch: branch.trim(),
        dealerCode: dealerCode.trim(),
        sessionHours: Math.min(24, Math.max(1, parseInt(String(sessionHours), 10) || 10)),
      });
      showToast('Settings saved');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getSheetTabRows = (tabKey: string) => {
    const bal = balances(db);

    switch (tabKey) {
      case 'parts':
        return {
          cols: [
            'partCode',
            'sku',
            'name',
            'category',
            'model',
            'uom',
            'rack',
            'purchasePrice',
            'sellingPrice',
            'gst',
            'minQty',
            'maxQty',
            'barcode',
            'description',
            'active',
            'id',
          ].map((k) => ({ label: k, k })),
          rows: db.parts,
        };
      case 'balances':
        return {
          cols: [
            { label: 'part_code', k: 'partCode' },
            { label: 'name', k: 'name' },
            { label: 'category', k: 'category' },
            { label: 'model', k: 'model' },
            { label: 'rack', k: 'rack' },
            { label: 'qty', k: 'qty' },
            { label: 'min_qty', k: 'minQty' },
            { label: 'max_qty', k: 'maxQty' },
            { label: 'status', k: 'st' },
            { label: 'as_of', k: 'asof' },
          ],
          rows: activeParts(db).map((p) => {
            const q = bal[p.id] || 0;
            return {
              ...p,
              qty: q,
              st: STATUS_L[statusOf(p, q)][0],
              asof: fmtDT(Date.now()),
            };
          }),
        };
      case 'ledger':
        return {
          cols: [
            { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
            ...[
              'type',
              'partCode',
              'partName',
              'qty',
              'before',
              'after',
              'destinationName',
              'chassis',
              'model',
              'salesInvoice',
              'supplierInvoice',
              'challanNo',
              'requestNo',
              'requestedBy',
              'issuedBy',
              'userName',
              'userRole',
              'reason',
              'remarks',
              'reversesId',
              'id',
            ].map((k) => ({ label: k, k })),
          ],
          rows: db.ledger,
        };
      case 'requests':
        return {
          cols: [
            { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
            ...[
              'no',
              'status',
              'destinationName',
              'chassis',
              'model',
              'salesInvoice',
              'customer',
              'requestedByName',
              'createdByName',
              'approvedByName',
              'remarks',
            ].map((k) => ({ label: k, k })),
            { label: 'challans', k: 'challans', format: (v: any) => (v || []).join(' ') },
            { label: 'id', k: 'id' },
          ],
          rows: db.requests,
        };
      case 'request_items':
        return {
          cols: ['requestNo', 'partCode', 'partName', 'qty', 'issued'].map((k) => ({
            label: k,
            k,
          })),
          rows: db.requests.flatMap((r) =>
            r.items.map((i) => ({ requestNo: r.no, ...i }))
          ),
        };
      case 'challans':
        return {
          cols: [
            { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
            ...[
              'no',
              'requestNo',
              'destinationName',
              'chassis',
              'model',
              'salesInvoice',
              'customer',
              'requestedByName',
              'issuedByName',
              'remarks',
            ].map((k) => ({ label: k, k })),
            {
              label: 'units',
              k: 'items',
              format: (v: any) =>
                (v || []).reduce((a: number, b: any) => a + Number(b.qty || 0), 0),
            },
          ],
          rows: db.challans,
        };
      case 'challan_items':
        return {
          cols: ['challanNo', 'partCode', 'partName', 'qty'].map((k) => ({
            label: k,
            k,
          })),
          rows: db.challans.flatMap((c) =>
            c.items.map((i) => ({ challanNo: c.no, ...i }))
          ),
        };
      case 'inwards':
        return {
          cols: [
            { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
            ...['no', 'invoiceNo', 'invoiceDate', 'supplier', 'userName', 'remarks'].map(
              (k) => ({ label: k, k })
            ),
            {
              label: 'units',
              k: 'lines',
              format: (v: any) =>
                (v || []).reduce((a: number, b: any) => a + Number(b.qty || 0), 0),
            },
          ],
          rows: db.inwards,
        };
      case 'destinations':
        return {
          cols: ['name', 'type', 'note', 'active', 'id'].map((k) => ({
            label: k,
            k,
          })),
          rows: db.destinations,
        };
      case 'users':
        return {
          cols: [
            ...['name', 'username', 'role', 'active', 'deleted'].map((k) => ({
              label: k,
              k,
            })),
            {
              label: 'lastLogin',
              k: 'lastLogin',
              format: (v: any) => (v ? new Date(v).toISOString() : ''),
            },
            { label: 'id', k: 'id' },
          ],
          rows: db.users,
        };
      case 'audit':
        return {
          cols: [
            { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
            ...['userName', 'role', 'action', 'detail', 'entity'].map((k) => ({
              label: k,
              k,
            })),
          ],
          rows: db.audit,
        };
      default:
        return { cols: [], rows: [] };
    }
  };

  const exportTabCSV = (tabKey: string, label: string) => {
    const { cols, rows } = getSheetTabRows(tabKey);
    const header = cols.map((c) => `"${c.label}"`).join(',');
    const body = rows.map((r: any) =>
      cols
        .map((c: any) => {
          let val = c.format ? c.format(r[c.k]) : r[c.k];
          if (val === undefined || val === null) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = '﻿' + [header, ...body].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tabKey}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Exported ${label} to CSV`);
  };

  const SHEET_TABS: [key: string, label: string][] = [
    ['parts', 'Parts'],
    ['balances', 'Stock balances'],
    ['ledger', 'Ledger'],
    ['requests', 'Requests'],
    ['request_items', 'Request items'],
    ['challans', 'Challans'],
    ['challan_items', 'Challan items'],
    ['inwards', 'Stock-in entries'],
    ['destinations', 'Destinations'],
    ['users', 'Users'],
    ['audit', 'Audit log'],
  ];

  const exportAllTabs = () => {
    SHEET_TABS.forEach(([k, label]) => exportTabCSV(k, label));
  };

  const downloadPartsTemplate = () => {
    const header = 'part_code,name,category,model,sku,uom,rack,purchase_price,selling_price,gst,min_qty,max_qty,opening_qty';
    const sample = 'GMA-HLM-999,Sample Helmet,Helmets,Universal,SKU-999,Nos,A-05,2000,2800,18,2,10,5';
    const csvContent = '﻿' + [header, sample].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parts_import_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportPartsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        // Parse CSV lines
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
        if (lines.length < 2) throw new Error('CSV file is empty or missing data rows.');

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map((line) => {
          const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] || '';
          });
          return obj;
        });

        const res = apiCall('importParts', rows);
        showToast(`Imported ${res.created} parts (${res.skipped} skipped)`);
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBackup = () => {
    const jsonStr = JSON.stringify(db, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jain_stock_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Full JSON backup downloaded');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        const parsed: Database = JSON.parse(text);
        if (!parsed || !parsed.version || !parsed.parts) {
          throw new Error('Invalid JSON backup format.');
        }
        setDB(parsed);
        refresh();
        showToast('Database restored successfully');
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDemo = async () => {
    const ok = await ask(
      'Reload sample data?',
      'This will replace your current data with the sample dataset. Continue?',
      'Reload sample data'
    );

    if (ok) {
      seed();
      saveStore(db);
      refresh();
      showToast('Sample dataset reloaded');
    }
  };

  const handleStartFresh = async () => {
    const confirmText = await ask(
      'Start fresh (empty database)?',
      'This will ERASE ALL data including parts, ledger history, requests, and challans. Only Super Admin account will remain.',
      'Start fresh',
      true,
      'Type RESET to confirm'
    );

    if (confirmText === 'RESET') {
      const su = userById('US_SUPER', db) || db.users.find((u) => u.role === 'super_admin');
      const fresh = baseDB();
      if (su) fresh.users.push(su);

      fresh.destinations = [
        ['DS_CUST', 'Customer vehicle', 'customer_vehicle'],
        ['DS_COUNTER', 'Counter sale', 'counter_sale'],
        ['DS_SWALL', 'Sales display wall', 'display'],
        ['DS_SVWALL', 'Service display wall', 'display'],
        ['DS_WS', 'Service workshop', 'department'],
      ].map((d) => ({ id: d[0], name: d[1], type: d[2] as any, note: '', active: true }));

      setDB(fresh);
      refresh();
      showToast('Empty database ready. Add parts or import CSV.');
    } else if (confirmText !== null) {
      showToast('Reset cancelled: text did not match "RESET"', 'error');
    }
  };

  return (
    <div>
      <div className="grid g-2">
        <section className="panel">
          <h2>Workflow rules</h2>
          <p className="hint">These change how every user works. Changes are logged.</p>

          <form onSubmit={handleSaveSettings}>
            <label className="check">
              <input
                type="checkbox"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
              />{' '}
              Requests need manager approval before issue
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={allowNegative}
                onChange={(e) => setAllowNegative(e.target.checked)}
              />{' '}
              Allow stock to go below zero (not recommended)
            </label>

            <div className="form-grid" style={{ marginTop: '10px' }}>
              <label className="field">
                Dealership name
                <input
                  value={dealership}
                  onChange={(e) => setDealership(e.target.value)}
                />
              </label>

              <label className="field">
                Branch
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </label>

              <label className="field">
                Dealer code
                <input
                  value={dealerCode}
                  onChange={(e) => setDealerCode(e.target.value)}
                />
              </label>

              <label className="field">
                Sign-in lasts (hours)
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={sessionHours}
                  onChange={(e) => setSessionHours(parseInt(e.target.value, 10) || 10)}
                />
              </label>
            </div>

            <div className="form-foot">
              <span />
              <button className="btn primary" type="submit">
                <Check size={18} /> Save settings
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Google Sheets Exports</h2>
          <p className="hint">
            Each tab below downloads as a CSV. In Google Sheets choose File, Import, Upload, then "Insert new sheet".
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {SHEET_TABS.map(([k, label]) => (
              <button
                key={k}
                className="btn sm"
                onClick={() => exportTabCSV(k, label)}
              >
                <Sheet size={16} /> {label}
              </button>
            ))}
          </div>

          <div className="form-foot">
            <span className="sub">
              {db.parts.length} parts · {db.ledger.length} ledger rows · {db.requests.length} requests
            </span>
            <button className="btn primary" onClick={exportAllTabs}>
              <Download size={18} /> Download all tabs
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Load parts from a physical count</h2>
          <p className="hint">
            Download the template, fill it in Google Sheets, export as CSV and upload. New part codes are created with their opening stock.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={downloadPartsTemplate}>
              <Download size={18} /> Template CSV
            </button>

            <label className="btn primary">
              <Upload size={18} /> Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportPartsCSV}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>Database &amp; Backups</h2>
          <p className="hint">
            This system stores everything safely in persistent local storage. Download JSON backups to save or restore datasets across devices.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleBackup}>
              <Download size={18} /> Full backup (JSON)
            </button>

            <label className="btn">
              <Upload size={18} /> Restore backup
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleRestore}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button className="btn" onClick={handleResetDemo}>
              <RefreshCw size={16} /> Reload sample data
            </button>

            <button className="btn danger" onClick={handleStartFresh}>
              <Trash2 size={16} /> Start fresh (empty)
            </button>
          </div>
        </section>
      </div>

      <div className="section-title">For the development team</div>
      <section className="panel">
        <div className="kv">
          {[
            ['Source of truth', 'Ledger (append-only)'],
            ['Stock calculation', 'Sum of ledger qty per part'],
            ['Destinations', 'Not warehouses; holding = issued minus returned'],
            ['Next.js Framework', 'App Router + TypeScript + Tailwind CSS'],
            ['Data persistence', 'Reactive store + localStorage / API ready'],
            ['Security contract', 'Transactional mutations, SHA-256 password hashing'],
          ].map(([k, v], i) => (
            <div key={i}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
