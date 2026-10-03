/**
 * @file src/components/Views/StockInView.tsx
 * @description Inward Stock Receipt (GRN Goods Received Note) View Component.
 * 
 * Facilitates registering inward stock shipments received from Royal Enfield / GMA suppliers:
 * 1. Form fields: Supplier Invoice Number, Invoice Date, Supplier Name, Remarks.
 * 2. Multi-line part intake using `LinesEditor`.
 * 3. Atomic transaction execution (`rawStockIn`) creating positive `IN` ledger entries (+Q).
 * 4. Recent Goods Received Notes (GRN) history list.
 * 
 * @module StockInViewComponent
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { isoDate, sum, fmtD, resolvePart, partById } from '@/lib/store';
import { LinesEditor, LineItem } from '../UI/LinesEditor';
import { Check, ArrowDownCircle } from 'lucide-react';

interface StockInViewProps {
  prefillPartId?: string | null;
  onClearPrefill?: () => void;
}

/** Inward Stock Entry View Component */
export const StockInView: React.FC<StockInViewProps> = ({ prefillPartId, onClearPrefill }) => {
  const { db, user, apiCall, showToast } = useApp();


  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(isoDate(Date.now()));
  const [supplier, setSupplier] = useState('Royal Enfield (GMA)');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    { id: '1', partInput: '', qty: 1 },
    { id: '2', partInput: '', qty: 1 },
    { id: '3', partInput: '', qty: 1 },
  ]);

  useEffect(() => {
    if (prefillPartId) {
      const part = partById(prefillPartId, db);
      if (part) {
        setLines([
          { id: '1', partInput: `${part.partCode} · ${part.name}`, qty: 1 },
          { id: '2', partInput: '', qty: 1 },
          { id: '3', partInput: '', qty: 1 },
        ]);
      }
      if (onClearPrefill) {
        onClearPrefill();
      }
    }
  }, [prefillPartId, db, onClearPrefill]);

  const recent = db.inwards.slice(-10).reverse();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const parsedLines = lines
        .filter((l) => l.partInput.trim())
        .map((l) => {
          const p = resolvePart(l.partInput, db);
          if (!p) throw new Error(`Part not found: "${l.partInput}". Pick it from the list.`);
          const q = parseInt(String(l.qty), 10);
          if (!(q > 0)) throw new Error(`Enter a valid quantity for ${p.partCode}.`);
          return { partId: p.id, qty: q };
        });

      if (!parsedLines.length) {
        throw new Error('Add at least one part with a quantity.');
      }

      const grn = apiCall('stockIn', {
        invoiceNo,
        invoiceDate,
        supplier,
        lines: parsedLines,
        remarks,
      });

      showToast(`Stock received successfully (${grn})`);
      setInvoiceNo('');
      setRemarks('');
      setLines([
        { id: '1', partInput: '', qty: 1 },
        { id: '2', partInput: '', qty: 1 },
        { id: '3', partInput: '', qty: 1 },
      ]);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="grid g-main">
      <section className="panel">
        <h2>Receive stock</h2>
        <p className="hint">
          Enter every line from one Royal Enfield GMA invoice. Stock updates for everyone the moment you save.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid three">
            <label className="field">
              RE invoice number <span className="req">*</span>
              <input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                required
                placeholder="e.g. RE/GMA/26/52110"
                style={{ textTransform: 'uppercase' }}
              />
            </label>

            <label className="field">
              Invoice date
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </label>

            <label className="field">
              Supplier
              <input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </label>
          </div>

          <LinesEditor lines={lines} onChange={setLines} />

          <label className="field" style={{ marginTop: '14px' }}>
            Remarks
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes"
            />
          </label>

          <div className="form-foot">
            <span className="sub">Recorded against your name: {user?.name}</span>
            <button className="btn primary" type="submit">
              <Check size={18} /> Save stock in
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent inward entries</h2>
        </div>

        {recent.length > 0 ? (
          recent.map((w) => (
            <div key={w.no} className="alert-row">
              <div className="feed-dot green">
                <ArrowDownCircle size={17} />
              </div>
              <div className="grow">
                <div className="t1 strong">{w.invoiceNo}</div>
                <div className="sub">
                  {w.no} · {fmtD(w.ts)} · {w.userName}
                </div>
              </div>
              <div className="num">
                <b>{sum(w.lines, 'qty')}</b>
                <div className="sub">{w.lines.length} line(s)</div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No stock received yet.</div>
        )}
      </section>
    </div>
  );
};
