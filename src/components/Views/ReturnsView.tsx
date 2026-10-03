'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  holdings,
  challanReturnable,
  destById,
  partById,
  resolvePart,
  stockOf,
  fmtDT,
} from '@/lib/store';
import { ADJ_REASONS, MV } from '@/lib/constants';
import { LinesEditor, LineItem } from '../UI/LinesEditor';
import { MovementBadge } from '../UI/Badge';
import { RotateCcw, Check, Undo2, Edit2 } from 'lucide-react';
import { Challan, Destination } from '@/types';

export const ReturnsView: React.FC = () => {
  const { db, user, can, apiCall, showToast } = useApp();

  const tabs: ['return' | 'adjust', string][] = [];
  if (can('return')) tabs.push(['return', 'Return to warehouse']);
  if (can('adjust')) tabs.push(['adjust', 'Stock adjustment']);

  const [activeTab, setActiveTab] = useState<'return' | 'adjust'>(
    tabs.length > 0 ? tabs[0][0] : 'return'
  );

  // Return Form State
  const [returnMode, setReturnMode] = useState<'challan' | 'destination'>('challan');
  const [selectedChallanNo, setSelectedChallanNo] = useState('');
  const [selectedDestId, setSelectedDestId] = useState('');
  const [condition, setCondition] = useState<'good' | 'damaged'>('good');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnLines, setReturnLines] = useState<LineItem[]>([
    { id: '1', partInput: '', qty: 1 },
  ]);

  // Adjustment Form State
  const [adjPartInput, setAdjPartInput] = useState('');
  const [adjDir, setAdjDir] = useState<'1' | '-1'>('-1');
  const [adjQty, setAdjQty] = useState<number | string>(1);
  const [adjReason, setAdjReason] = useState(ADJ_REASONS[0]);
  const [adjRemarks, setAdjRemarks] = useState('');

  const chs = db.challans
    .slice()
    .reverse()
    .filter((c) =>
      c.items.some((i) => challanReturnable(c.no, i.partId, db) > 0)
    )
    .slice(0, 300);

  const dests = db.destinations.filter((d) =>
    Object.values(holdings(db)[d.id] || {}).some((q) => q > 0)
  );

  const activeHoldingsMap: Record<string, number> = {};
  if (returnMode === 'challan' && selectedChallanNo) {
    const ch = db.challans.find((c) => c.no === selectedChallanNo);
    if (ch) {
      ch.items.forEach((i) => {
        activeHoldingsMap[i.partId] = challanReturnable(ch.no, i.partId, db);
      });
    }
  } else if (returnMode === 'destination' && selectedDestId) {
    const hold = holdings(db)[selectedDestId] || {};
    Object.assign(activeHoldingsMap, hold);
  }

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedLines = returnLines
        .filter((l) => l.partInput.trim())
        .map((l) => {
          const p = resolvePart(l.partInput, db);
          if (!p) throw new Error(`Part not found: "${l.partInput}".`);
          const q = parseInt(String(l.qty), 10);
          if (!(q > 0)) throw new Error(`Enter quantity for ${p.partCode}.`);
          return { partId: p.id, qty: q };
        });

      if (!parsedLines.length) throw new Error('Enter at least one quantity to return.');
      if (!returnRemarks.trim()) throw new Error('Add a short note on why it came back.');

      const no = apiCall('returnStock', {
        mode: returnMode,
        challanNo: selectedChallanNo,
        destinationId: selectedDestId,
        condition,
        remarks: returnRemarks,
        lines: parsedLines,
      });

      showToast(`Stock return recorded (${no})`);
      setReturnRemarks('');
      setReturnLines([{ id: '1', partInput: '', qty: 1 }]);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const p = resolvePart(adjPartInput, db);
      if (!p) throw new Error('Choose a valid part.');
      const q = parseInt(String(adjQty), 10);
      if (!q) throw new Error('Enter a valid quantity.');
      if (!adjRemarks.trim()) throw new Error('Remarks are required for every adjustment.');

      const finalQty = q * parseInt(adjDir, 10);

      const no = apiCall('adjust', {
        partId: p.id,
        qty: finalQty,
        reason: adjReason,
        remarks: adjRemarks,
      });

      showToast(`Adjustment saved (${no})`);
      setAdjPartInput('');
      setAdjRemarks('');
      setAdjQty(1);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const recent = db.ledger
    .filter((r) => r.type === 'RETURN' || r.type === 'ADJUST' || r.type === 'REVERSAL')
    .slice(-12)
    .reverse();

  const resolvedAdjPart = resolvePart(adjPartInput, db);

  return (
    <div>
      {tabs.length > 1 && (
        <div className="toolbar">
          <div className="tabs">
            {tabs.map(([tKey, tLabel]) => (
              <button
                key={tKey}
                className={activeTab === tKey ? 'on' : ''}
                onClick={() => setActiveTab(tKey)}
              >
                {tLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid g-main">
        <section className="panel">
          {activeTab === 'return' ? (
            <>
              <h2>Return to warehouse</h2>
              <p className="hint">
                Stock coming back from a customer bike, a display or offsite storage. It goes back on the shelf, or is written off if damaged.
              </p>

              <form onSubmit={handleReturnSubmit}>
                <div className="form-grid">
                  <label className="field">
                    Return against
                    <select
                      value={returnMode}
                      onChange={(e) => setReturnMode(e.target.value as any)}
                    >
                      <option value="challan">A delivery challan</option>
                      <option value="destination">A destination (display, offsite)</option>
                    </select>
                  </label>

                  {returnMode === 'challan' ? (
                    <label className="field">
                      Challan
                      <select
                        value={selectedChallanNo}
                        onChange={(e) => setSelectedChallanNo(e.target.value)}
                      >
                        <option value="">Select challan</option>
                        {chs.map((c) => (
                          <option key={c.no} value={c.no}>
                            {c.no} · {c.destinationName}
                            {c.chassis ? ` · ${c.chassis}` : ''}
                            {c.salesInvoice ? ` · ${c.salesInvoice}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="field">
                      Destination
                      <select
                        value={selectedDestId}
                        onChange={(e) => setSelectedDestId(e.target.value)}
                      >
                        <option value="">Select destination</option>
                        {dests.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="field">
                    Condition
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as any)}
                    >
                      <option value="good">Good: back on the shelf</option>
                      <option value="damaged">Damaged: write off</option>
                    </select>
                  </label>

                  <label className="field">
                    Reason <span className="req">*</span>
                    <input
                      placeholder="e.g. Customer changed mind, display refreshed"
                      value={returnRemarks}
                      onChange={(e) => setReturnRemarks(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <LinesEditor
                    lines={returnLines}
                    onChange={setReturnLines}
                    maxReturnableMap={activeHoldingsMap}
                  />
                </div>

                <div className="form-foot">
                  <span className="sub">
                    A return line is added to the ledger. Nothing is edited or deleted.
                  </span>
                  <button className="btn primary" type="submit">
                    <RotateCcw size={18} /> Record return
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2>Stock adjustment</h2>
              <p className="hint">
                Use only when a physical count differs from the system, or stock is damaged, lost or found. Every adjustment needs a reason and is visible in the audit log.
              </p>

              <form onSubmit={handleAdjustSubmit}>
                <div className="form-grid">
                  <label className="field span-2">
                    Part <span className="req">*</span>
                    <input
                      list="dl-parts"
                      placeholder="Type part code or name"
                      value={adjPartInput}
                      onChange={(e) => setAdjPartInput(e.target.value)}
                      autoComplete="off"
                      required
                    />
                    {resolvedAdjPart && (
                      <span className="sub">
                        <b>{resolvedAdjPart.partCode}</b> · {resolvedAdjPart.name} · Current stock: {stockOf(resolvedAdjPart.id, db)}
                      </span>
                    )}
                  </label>

                  <label className="field">
                    Direction
                    <select
                      value={adjDir}
                      onChange={(e) => setAdjDir(e.target.value as any)}
                    >
                      <option value="-1">Remove from stock</option>
                      <option value="1">Add to stock</option>
                    </select>
                  </label>

                  <label className="field">
                    Quantity <span className="req">*</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={adjQty}
                      onChange={(e) => setAdjQty(e.target.value)}
                      required
                      inputMode="numeric"
                    />
                  </label>

                  <label className="field">
                    Reason
                    <select
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                    >
                      {ADJ_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    Remarks <span className="req">*</span>
                    <input
                      placeholder="What happened?"
                      value={adjRemarks}
                      onChange={(e) => setAdjRemarks(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="form-foot">
                  <span className="sub">
                    For a wrong entry, use Reverse in the Stock Ledger instead.
                  </span>
                  <button className="btn primary" type="submit">
                    <Check size={18} /> Save adjustment
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent returns and corrections</h2>
          </div>

          {recent.length > 0 ? (
            recent.map((r) => {
              const m = MV[r.type] || [r.type, 'muted', 'doc'];
              const qtyDisplay = r.qty > 0 ? `+${r.qty}` : `${r.qty}`;

              return (
                <div key={r.id} className="alert-row">
                  <div className={`feed-dot ${m[1]}`}>
                    {r.type === 'RETURN' ? (
                      <Undo2 size={17} />
                    ) : (
                      <Edit2 size={17} />
                    )}
                  </div>
                  <div className="grow">
                    <div className="t1">
                      <b>{m[0]}</b>{' '}
                      <span className={r.qty > 0 ? 'qpos' : 'qneg'}>
                        {qtyDisplay}
                      </span>{' '}
                      · {r.partName}
                    </div>
                    <div className="sub">
                      {r.reason || ''}
                      {r.remarks ? ` · ${r.remarks}` : ''}
                    </div>
                    <div className="sub">
                      {r.userName} · {fmtDT(r.ts)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty">Nothing yet.</div>
          )}
        </section>
      </div>
    </div>
  );
};
