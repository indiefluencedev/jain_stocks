/**
 * @file src/components/UI/LinesEditor.tsx
 * @description Dynamic Line-Item Form Editor for Stock Requests, Stock-In & Returns.
 * 
 * Provides an interactive line-item list editor with:
 * 1. Autocomplete part lookup against the master part catalogue (`dl-parts`).
 * 2. Real-time live stock display (`checkStock`).
 * 3. Returnable quantity constraint checks (`maxReturnableMap`).
 * 4. Add/Remove line item handlers.
 * 
 * @module LinesEditorComponent
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { activeParts, resolvePart, stockOf } from '@/lib/store';
import { Plus, X } from 'lucide-react';

/** Line Item State Schema */
export interface LineItem {
  id: string;
  partInput: string;
  qty: number | string;
}

interface LinesEditorProps {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  maxReturnableMap?: Record<string, number>;
  checkStock?: boolean;
}

/**
 * Interactive Line Item Form Component.
 */
export const LinesEditor: React.FC<LinesEditorProps> = ({
  lines,
  onChange,
  maxReturnableMap,
  checkStock = false,
}) => {
  const { db } = useApp();
  const parts = activeParts(db);

  const addLine = (initialValue = '') => {
    const newLine: LineItem = {
      id: Math.random().toString(36).substring(2),
      partInput: initialValue,
      qty: 1,
    };
    onChange([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, key: keyof LineItem, value: any) => {
    onChange(
      lines.map((l) => (l.id === id ? { ...l, [key]: value } : l))
    );
  };

  return (
    <div className="lines">
      <datalist id="dl-parts">
        {parts.map((p) => (
          <option key={p.id} value={`${p.partCode} · ${p.name}`} />
        ))}
      </datalist>

      <div className="lines-head">
        <span>Part</span>
        <span>Qty</span>
        <span></span>
      </div>

      <div className="lines-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {lines.map((l) => {
          const resolved = resolvePart(l.partInput, db);
          const currentStock = resolved ? stockOf(resolved.id, db) : 0;
          const maxReturnable =
            resolved && maxReturnableMap ? maxReturnableMap[resolved.id] : undefined;

          return (
            <div key={l.id} className="line">
              <div style={{ minWidth: 0 }}>
                <input
                  list="dl-parts"
                  className="ln-part"
                  placeholder="Type part code or name"
                  value={l.partInput}
                  onChange={(e) => updateLine(l.id, 'partInput', e.target.value)}
                  autoComplete="off"
                />
                <div className="ln-info sub">
                  {resolved ? (
                    <span>
                      <b>{resolved.partCode}</b> · {resolved.name}
                      {checkStock && ` · Stock: ${currentStock}`}
                      {maxReturnable !== undefined && ` · Max returnable: ${maxReturnable}`}
                    </span>
                  ) : l.partInput.trim() ? (
                    <span style={{ color: 'var(--amber)' }}>Pick a part from the list</span>
                  ) : null}
                </div>
              </div>

              <div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="ln-qty"
                  value={l.qty}
                  onChange={(e) => updateLine(l.id, 'qty', e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeLine(l.id)}
                  title="Remove line"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="btn ghost sm"
        onClick={() => addLine('')}
        style={{ marginTop: '8px' }}
      >
        <Plus size={16} /> Add another part
      </button>
    </div>
  );
};
