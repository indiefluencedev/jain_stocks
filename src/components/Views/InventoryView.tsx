/**
 * @file src/components/Views/InventoryView.tsx
 * @description Master Parts Catalogue & Inventory Management View.
 * 
 * Features:
 * 1. Filterable Parts Catalogue (Search query, Category, Bike Model, Stock Status).
 * 2. RBAC Masking: Purchase cost price & total value columns visible only to `see_value` permission.
 * 3. Part Master Editor Modal (Create/Edit Part Code, SKU, Rack Location, Pricing, Thresholds).
 * 4. Part Detail Inspection Modal with historical movement timeline.
 * 5. Export catalogue data to CSV (`can('export')`).
 * 
 * @module InventoryViewComponent
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { activeParts, balances, statusOf, partById, fmtINR, fmtDT } from '@/lib/store';
import { MODELS, STATUS_L, MV } from '@/lib/constants';
import { Table, Column } from '../UI/Table';
import { StockBadge, MovementBadge } from '../UI/Badge';
import { Search, Plus, Download, ArrowDownCircle, Edit2 } from 'lucide-react';
import { Part, StockStatus } from '@/types';

interface InventoryViewProps {
  onGoStockIn?: (partId: string) => void;
}

/** Master Inventory & Parts View Component */
export const InventoryView: React.FC<InventoryViewProps> = ({ onGoStockIn }) => {
  const { db, can, apiCall, showToast, openModal, closeModal, setRoute } = useApp();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [model, setModel] = useState('');
  const [st, setSt] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [serverPagination, setServerPagination] = useState<{
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('inv_search');
      if (saved) {
        setQ(saved);
        window.sessionStorage.removeItem('inv_search');
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q.trim()) params.set('search', q.trim());
    if (cat) params.set('category', cat);

    fetch(`/api/inventory?${params.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.pagination) {
          setServerPagination(res.pagination);
        }
      })
      .catch((err) => console.warn('Inventory API fetch fallback:', err));
  }, [page, pageSize, q, cat]);

  const parts = activeParts(db);
  const bal = balances(db);

  const categories = Array.from(new Set(parts.map((p) => p.category))).sort();
  const bikeModels = Array.from(new Set(parts.map((p) => p.model))).sort();

  const filteredParts = parts
    .filter((p) => {
      const qty = bal[p.id] || 0;
      const status = statusOf(p, qty);
      const queryStr = (
        p.partCode +
        ' ' +
        p.sku +
        ' ' +
        p.name +
        ' ' +
        p.category +
        ' ' +
        p.model +
        ' ' +
        p.rack
      ).toLowerCase();

      if (q.trim() && !queryStr.includes(q.trim().toLowerCase())) return false;
      if (cat && p.category !== cat) return false;
      if (model && p.model !== model) return false;
      if (st === 'alert') return status === 'out' || status === 'low';
      if (st && status !== st) return false;
      return true;
    })
    .sort((a, b) => a.partCode.localeCompare(b.partCode));

  const openPartModal = (partId?: string) => {
    const existing = partId ? partById(partId, db) : null;

    openModal({
      title: existing ? 'Edit part' : 'Add part',
      body: (
        <form
          id="f-part"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form));
            if (existing) data.id = existing.id;

            try {
              const res = apiCall('savePart', data);
              closeModal();
              showToast((existing ? 'Saved ' : 'Created ') + res.partCode);
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          }}
        >
          <div className="form-grid">
            <label className="field">
              Part code <span className="req">*</span>
              <input
                name="partCode"
                defaultValue={existing?.partCode || ''}
                required
                placeholder="e.g. GMA-HLM-101"
                style={{ textTransform: 'uppercase' }}
              />
            </label>
            <label className="field">
              SKU
              <input name="sku" defaultValue={existing?.sku || ''} placeholder="Internal SKU" />
            </label>
            <label className="field span-2">
              Part name <span className="req">*</span>
              <input name="name" defaultValue={existing?.name || ''} required placeholder="Full description" />
            </label>
            <label className="field">
              Category
              <input
                name="category"
                defaultValue={existing?.category || 'General'}
                placeholder="e.g. Helmets, Protection"
              />
            </label>
            <label className="field">
              Bike model
              <select name="model" defaultValue={existing?.model || 'Universal'}>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Unit of measure
              <input name="uom" defaultValue={existing?.uom || 'Nos'} />
            </label>
            <label className="field">
              Rack location
              <input name="rack" defaultValue={existing?.rack || ''} placeholder="e.g. A-01" />
            </label>
            {can('see_value') && (
              <>
                <label className="field">
                  Purchase cost price (₹)
                  <input
                    name="purchasePrice"
                    type="number"
                    step="0.01"
                    defaultValue={existing?.purchasePrice || 0}
                  />
                </label>
                <label className="field">
                  Selling price (₹)
                  <input
                    name="sellingPrice"
                    type="number"
                    step="0.01"
                    defaultValue={existing?.sellingPrice || 0}
                  />
                </label>
                <label className="field">
                  GST rate (%)
                  <input
                    name="gst"
                    type="number"
                    defaultValue={existing?.gst || 18}
                  />
                </label>
              </>
            )}
            <label className="field">
              Minimum stock level
              <input
                name="minQty"
                type="number"
                defaultValue={existing?.minQty || 0}
              />
            </label>
            <label className="field">
              Maximum stock level
              <input
                name="maxQty"
                type="number"
                defaultValue={existing?.maxQty || 0}
              />
            </label>

            {!existing && (
              <label className="field span-2">
                Opening stock quantity
                <input
                  name="openingQty"
                  type="number"
                  min="0"
                  defaultValue="0"
                  placeholder="Initial physical count"
                />
              </label>
            )}
          </div>
        </form>
      ),
      foot: (
        <>
          {existing && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                try {
                  apiCall('setPartActive', existing.id, !existing.active);
                  closeModal();
                  showToast(
                    existing.partCode +
                      (existing.active ? ' deactivated' : ' reactivated')
                  );
                } catch (err: any) {
                  showToast(err.message, 'error');
                }
              }}
            >
              {existing.active ? 'Deactivate' : 'Reactivate'}
            </button>
          )}
          <button type="submit" form="f-part" className="btn primary">
            Save part
          </button>
        </>
      ),
    });
  };

  const openPartDetail = (part: Part) => {
    const qty = bal[part.id] || 0;
    const status = statusOf(part, qty);
    const history = db.ledger
      .filter((r) => r.partId === part.id)
      .slice()
      .reverse();

    openModal({
      title: `${part.partCode} · ${part.name}`,
      size: 'wide',
      body: (
        <div>
          <div className="kv" style={{ marginBottom: '18px' }}>
            <div>
              <div className="k">Current stock</div>
              <div className="v" style={{ fontSize: '24px', color: 'var(--gold-2)' }}>
                {qty} {part.uom}
              </div>
            </div>
            <div>
              <div className="k">Status</div>
              <div className="v">
                <StockBadge status={status} />
              </div>
            </div>
            <div>
              <div className="k">Rack</div>
              <div className="v">{part.rack || '-'}</div>
            </div>
            <div>
              <div className="k">Category</div>
              <div className="v">{part.category}</div>
            </div>
            <div>
              <div className="k">Model</div>
              <div className="v">{part.model}</div>
            </div>
            {can('see_value') && (
              <>
                <div>
                  <div className="k">Purchase price</div>
                  <div className="v">{fmtINR(part.purchasePrice)}</div>
                </div>
                <div>
                  <div className="k">Selling price</div>
                  <div className="v">{fmtINR(part.sellingPrice)}</div>
                </div>
              </>
            )}
            <div>
              <div className="k">Min / Max level</div>
              <div className="v">
                min {part.minQty} {part.maxQty ? `· max ${part.maxQty}` : ''}
              </div>
            </div>
          </div>

          <div className="section-title">Stock Movement History</div>
          <Table
            columns={[
              { label: 'When', format: (v, r) => fmtDT(r.ts) },
              { label: 'Type', render: (r) => <MovementBadge type={r.type} /> },
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
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {r.destinationName && <span className="sub">{r.destinationName}</span>}
                    {r.chassis && <span className="chip">Chassis {r.chassis}</span>}
                    {r.salesInvoice && <span className="chip">Inv {r.salesInvoice}</span>}
                    {r.supplierInvoice && <span className="chip">RE {r.supplierInvoice}</span>}
                    {r.challanNo && <span className="chip">{r.challanNo}</span>}
                  </div>
                ),
              },
              { label: 'By', render: (r) => r.userName },
              { label: 'Remarks', render: (r) => <span className="sub">{r.remarks || '-'}</span> },
            ]}
            data={history}
            emptyText="No movement history for this part."
          />
        </div>
      ),
      foot: (
        <>
          {can('parts_edit') && (
            <button
              className="btn"
              onClick={() => {
                closeModal();
                openPartModal(part.id);
              }}
            >
              <Edit2 size={16} /> Edit part details
            </button>
          )}
          {can('stock_in') && (
            <button
              className="btn primary"
              onClick={() => {
                closeModal();
                if (onGoStockIn) onGoStockIn(part.id);
                else setRoute('stockin');
              }}
            >
              <ArrowDownCircle size={16} /> Stock in this part
            </button>
          )}
        </>
      ),
    });
  };

  const columns: Column<Part>[] = [
    {
      label: 'Part code',
      render: (p) => (
        <div>
          <div className="code">{p.partCode}</div>
          <div className="sub">{p.sku || ''}</div>
        </div>
      ),
    },
    {
      label: 'Part',
      render: (p) => (
        <div>
          <div className="strong">{p.name}</div>
          <div className="sub">{p.model}</div>
        </div>
      ),
    },
    { label: 'Category', key: 'category' },
    { label: 'Rack', key: 'rack' },
    {
      label: 'In stock',
      num: true,
      render: (p) => {
        const qty = bal[p.id] || 0;
        const status = statusOf(p, qty);
        const cap = Math.max(Number(p.maxQty) || 0, qty, 1);
        const widthPct = Math.min(100, Math.max(qty, 0) / cap * 100).toFixed(0);

        return (
          <div>
            <div className="qty">{qty}</div>
            <div className="bar">
              <i className={status} style={{ width: `${widthPct}%` }} />
            </div>
            <div className="sub">
              min {p.minQty}
              {p.maxQty ? ` · max ${p.maxQty}` : ''}
            </div>
          </div>
        );
      },
    },
    {
      label: 'Status',
      render: (p) => <StockBadge status={statusOf(p, bal[p.id] || 0)} />,
    },
  ];

  if (can('see_value')) {
    columns.push({
      label: 'Selling price',
      num: true,
      render: (p) => fmtINR(p.sellingPrice),
    });
  }

  columns.push({
    label: '',
    cls: 'actions',
    render: (p) => (
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        {can('stock_in') && (
          <button
            className="btn sm"
            onClick={(e) => {
              e.stopPropagation();
              if (onGoStockIn) onGoStockIn(p.id);
              else setRoute('stockin');
            }}
          >
            <ArrowDownCircle size={16} /> In
          </button>
        )}
        {can('parts_edit') && (
          <button
            className="icon-btn"
            title="Edit part"
            aria-label="Edit part"
            onClick={(e) => {
              e.stopPropagation();
              openPartModal(p.id);
            }}
          >
            <Edit2 size={18} />
          </button>
        )}
      </div>
    ),
  });

  const exportCSV = () => {
    const cols = [
      { label: 'part_code', k: 'partCode' },
      { label: 'name', k: 'name' },
      { label: 'category', k: 'category' },
      { label: 'model', k: 'model' },
      { label: 'rack', k: 'rack' },
      { label: 'qty', k: 'qty' },
      { label: 'min_qty', k: 'minQty' },
      { label: 'max_qty', k: 'maxQty' },
      { label: 'status', k: 'st' },
    ];
    const rows = filteredParts.map((p) => {
      const q = bal[p.id] || 0;
      return {
        partCode: p.partCode,
        name: p.name,
        category: p.category,
        model: p.model,
        rack: p.rack,
        qty: q,
        minQty: p.minQty,
        maxQty: p.maxQty,
        st: STATUS_L[statusOf(p, q)][0],
      };
    });

    const csvContent =
      '﻿' +
      [
        cols.map((c) => `"${c.label}"`).join(','),
        ...rows.map((r: any) => cols.map((c) => `"${r[c.k] ?? ''}"`).join(',')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_stock_${new Date().toISOString().slice(0, 10)}.csv`;
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
            placeholder="Search part code, SKU, name, bike model or rack"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
          />
        </div>

        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">Model</option>
          {bikeModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Status</option>
          <option value="alert">Needs attention</option>
          <option value="out">Out of stock</option>
          <option value="low">Low stock</option>
          <option value="over">Overstocked</option>
          <option value="ok">In stock</option>
        </select>

        {can('parts_edit') && (
          <button className="btn primary" onClick={() => openPartModal()}>
            <Plus size={18} /> Add part
          </button>
        )}

        {can('export') && (
          <button className="btn" onClick={exportCSV}>
            <Download size={18} /> CSV
          </button>
        )}
      </div>

      <p className="sub" style={{ margin: '0 0 10px' }}>
        {filteredParts.length} part(s)
      </p>

      <Table
        columns={columns}
        data={filteredParts}
        emptyText="No parts match your search."
        onRowClick={openPartDetail}
        pagination={
          serverPagination
            ? {
                page,
                pageSize,
                totalRecords: serverPagination.totalRecords,
                totalPages: serverPagination.totalPages,
                hasNextPage: serverPagination.hasNextPage,
                hasPrevPage: serverPagination.hasPrevPage,
                onPageChange: (p) => setPage(p),
              }
            : undefined
        }
      />
    </div>
  );
};
