/**
 * @file src/components/Views/DashboardView.tsx
 * @description Main Executive & Operational Stock Dashboard View.
 * 
 * Renders summary metrics, quick action triggers, low stock alerts, and recent ledger activity:
 * 1. Summary Cards (Total Active Parts, Low Stock Count, Out of Stock Count, Total Stock Valuation).
 * 2. Financial values masked unless user holds `see_value` permission.
 * 3. Fast Part Stock Lookup search box.
 * 4. Critical Re-order Alert list & Recent Stock Movements feed.
 * 
 * @module DashboardViewComponent
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import {
  activeParts,
  balances,
  statusOf,
  fmtN,
  fmtINR,
  startOfDay,
  ago,
} from '@/lib/store';
import { MV, STATUS_L } from '@/lib/constants';
import { StockBadge } from '../UI/Badge';
import {
  Plus,
  ArrowDownCircle,
  Search,
  AlertTriangle,
  Box,
  ArrowUpRight,
  Undo2,
  FileText,
  Edit,
} from 'lucide-react';
import { Part, StockStatus } from '@/types';

interface DashboardViewProps {
  onNewRequest: (directIssue?: boolean) => void;
}

/** Dashboard Overview View Component */
export const DashboardView: React.FC<DashboardViewProps> = ({ onNewRequest }) => {
  const { db, user, setRoute, can } = useApp();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return null;


  const parts = activeParts(db);
  const bal = balances(db);

  let units = 0;
  let vp = 0;
  let vs = 0;
  const low: [Part, number][] = [];
  const out: [Part, number][] = [];
  const over: [Part, number][] = [];

  for (const p of parts) {
    const q = bal[p.id] || 0;
    if (q > 0) {
      units += q;
      vp += q * p.purchasePrice;
      vs += q * p.sellingPrice;
    }
    const s = statusOf(p, q);
    if (s === 'out') out.push([p, q]);
    else if (s === 'low') low.push([p, q]);
    else if (s === 'over') over.push([p, q]);
  }

  const today = startOfDay(Date.now());
  const tm = db.ledger.filter((r) => r.ts >= today);
  const issuedToday = tm
    .filter((r) => r.type === 'ISSUE')
    .reduce((a, r) => a - r.qty, 0);

  let openReqs = db.requests.filter(
    (r) => r.status === 'Requested' || r.status === 'Approved' || r.status === 'Partially issued'
  );
  if (user.role === 'sales_rep') {
    openReqs = openReqs.filter(
      (r) => r.requestedById === user.id || r.createdById === user.id
    );
  }

  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const cards = [
    { label: 'Active parts', val: fmtN(parts.length), sub: `${fmtN(units)} units on hand`, cls: '' },
    can('see_value')
      ? {
          label: 'Stock value (cost)',
          val: fmtINR(vp),
          sub: `${fmtINR(vs)} at selling price`,
          cls: 'gold',
        }
      : null,
    { label: 'Low stock', val: low.length, sub: 'At or below minimum', cls: 'amber' },
    { label: 'Out of stock', val: out.length, sub: 'Nothing on the shelf', cls: 'red' },
    {
      label: 'Open requests',
      val: openReqs.length,
      sub: db.settings.approvalRequired ? 'Awaiting approval or issue' : 'Waiting to be issued',
      cls: '',
    },
    {
      label: 'Issued today',
      val: fmtN(issuedToday),
      sub: `${tm.length} movement(s) today`,
      cls: '',
    },
  ].filter(Boolean) as { label: string; val: any; sub: string; cls: string }[];

  const cats: Record<string, number> = {};
  parts.forEach((p) => {
    const q = Math.max(bal[p.id] || 0, 0);
    cats[p.category] = (cats[p.category] || 0) + q;
  });
  const cmax = Math.max(1, ...Object.values(cats));

  const alerts = [...out, ...low];
  const recent = db.ledger.slice(-9).reverse();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('inv_search', searchQuery);
    }
    setRoute('inventory');
    router.push('/inventory');
  };

  const getFeedIcon = (type: string) => {
    switch (type) {
      case 'IN':
      case 'OPENING':
        return <Box size={17} />;
      case 'ISSUE':
        return <ArrowUpRight size={17} />;
      case 'RETURN':
      case 'REVERSAL':
        return <Undo2 size={17} />;
      case 'ADJUST':
        return <Edit size={17} />;
      default:
        return <FileText size={17} />;
    }
  };

  return (
    <div>
      <div className="greet">
        <div>
          <h2>
            {greet}, {user.name.split(' ')[0]}
          </h2>
          <p>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · {db.settings.dealership}, {db.settings.branch}
          </p>
        </div>

        <div className="quick">
          {can('request_create') && (
            <button
              className="btn primary"
              onClick={() => onNewRequest(can('issue'))}
            >
              <Plus size={18} />
              {can('issue') ? ' Issue stock' : ' Request stock'}
            </button>
          )}

          {can('stock_in') && (
            <button
              className="btn"
              onClick={() => {
                setRoute('stockin');
                router.push('/stockin');
              }}
            >
              <ArrowDownCircle size={18} /> Stock in
            </button>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '18px', padding: '14px' }}>
        <form onSubmit={handleSearchSubmit} className="search" style={{ minWidth: 0 }}>
          <Search size={18} className="ic" />
          <input
            placeholder="Quick stock check: part code, name or bike model"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            enterKeyHint="search"
          />
        </form>
      </div>

      <div className="stats">
        {cards.map((c, idx) => (
          <div key={idx} className={`stat ${c.cls}`}>
            <div className="l">{c.label}</div>
            <div className="v">{c.val}</div>
            <div className="s">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid g-main" style={{ marginTop: '18px' }}>
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>Needs attention</h2>
              <button
                className="btn ghost sm"
                onClick={() => {
                  setRoute('inventory');
                  router.push('/inventory');
                }}
              >
                See all
              </button>
            </div>

            {alerts.length > 0 ? (
              alerts.slice(0, 8).map(([p, q]) => {
                const s = statusOf(p, q);
                return (
                  <div key={p.id} className="alert-row">
                    <div className={`feed-dot ${s === 'out' ? 'red' : 'amber'}`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div className="grow">
                      <div className="t1 strong">{p.name}</div>
                      <div className="sub">
                        {p.partCode} · Rack {p.rack || '-'} · min {p.minQty}
                      </div>
                    </div>
                    <div className="num">
                      <div
                        className="qty"
                        style={{
                          fontFamily: 'var(--f-display)',
                          fontSize: '22px',
                          fontWeight: 700,
                        }}
                      >
                        {q}
                      </div>
                    </div>
                    <StockBadge status={s} />
                  </div>
                );
              })
            ) : (
              <div className="empty">All parts are above their minimum level.</div>
            )}

            {over.length > 0 && (
              <p className="hint" style={{ margin: '12px 0 0' }}>
                {over.length} part(s) are above their maximum level. See Reports, Movement analytics.
              </p>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Stock by category</h2>
              <span className="sub">units on hand</span>
            </div>

            {Object.entries(cats)
              .sort((a, b) => b[1] - a[1])
              .map(([c, v]) => (
                <div key={c} className="cat-row">
                  <span>{c}</span>
                  <div className="track">
                    <i style={{ width: `${((v / cmax) * 100).toFixed(1)}%` }} />
                  </div>
                  <span className="num strong">{v}</span>
                </div>
              ))}
          </section>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
            {can('reports') && (
              <button
                className="btn ghost sm"
                onClick={() => {
                  setRoute('ledger');
                  router.push('/ledger');
                }}
              >
                Full ledger
              </button>
            )}
          </div>

          <div className="feed">
            {recent.map((r) => {
              const m = MV[r.type] || [r.type, 'muted', 'doc'];
              const dest = r.destinationName ? ` to ${r.destinationName}` : '';
              const qtyDisplay = r.qty > 0 ? `+${r.qty}` : `${r.qty}`;

              return (
                <div key={r.id} className="feed-item">
                  <div className={`feed-dot ${m[1]}`}>{getFeedIcon(r.type)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="t1">
                      <b>{m[0]}</b>{' '}
                      <span className={r.qty > 0 ? 'qpos' : 'qneg'}>
                        {qtyDisplay}
                      </span>{' '}
                      · {r.partName}
                    </div>
                    <div className="t2">
                      {r.partCode}
                      {r.type === 'ISSUE' ? dest : ''}
                      {r.chassis ? ` · chassis ${r.chassis}` : ''}
                      {r.salesInvoice ? ` · inv ${r.salesInvoice}` : ''}
                      {r.supplierInvoice ? ` · RE inv ${r.supplierInvoice}` : ''}
                    </div>
                    <div className="t2">
                      {r.userName} · {ago(r.ts)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
