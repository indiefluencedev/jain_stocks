/**
 * @file src/components/Views/DestinationsView.tsx
 * @description Destinations, Bikes & Workshop Bays Tracking View Component.
 * 
 * Features:
 * 1. Chassis Number / Frame Lookup: View complete parts fitting history for specific customer bikes.
 * 2. Real-time Destination Holding balances: Shows parts currently installed/held on display bikes or workshop bays.
 * 3. Create & Edit Destinations (`can('destinations_edit')`).
 * 
 * @module DestinationsViewComponent
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { holdings, destById, partById, fmtDT } from '@/lib/store';
import { DEST_TYPES } from '@/lib/constants';
import { Table, Column } from '../UI/Table';
import { Badge } from '../UI/Badge';
import { MovementBadge } from '../UI/Badge';
import { Bike, Search, Plus, MapPin } from 'lucide-react';
import { Destination, LedgerRow } from '@/types';

/** Destinations & Bikes Tracking View Component */
export const DestinationsView: React.FC = () => {
  const { db, can, apiCall, showToast, openModal, closeModal } = useApp();

  const [chassisQuery, setChassisQuery] = useState('');

  const h = holdings(db);
  const q = chassisQuery.trim().toUpperCase();

  let chassisBlock: React.ReactNode = null;

  if (q) {
    const rows = db.ledger
      .filter(
        (r) =>
          r.chassis &&
          r.chassis.toUpperCase().includes(q) &&
          ['ISSUE', 'RETURN', 'REVERSAL'].includes(r.type)
      )
      .sort((a, b) => a.chassis.localeCompare(b.chassis) || a.ts - b.ts);

    const byChassis: Record<string, LedgerRow[]> = {};
    rows.forEach((r) => {
      byChassis[r.chassis] = byChassis[r.chassis] || [];
      byChassis[r.chassis].push(r);
    });

    const entries = Object.entries(byChassis);

    chassisBlock =
      entries.length > 0 ? (
        entries.map(([c, rs]) => {
          const net: Record<string, number> = {};
          rs.forEach((r) => {
            net[r.partId] = (net[r.partId] || 0) - r.qty;
          });
          const fitted = Object.entries(net).filter((x) => x[1] > 0);
          const fittedCount = fitted.reduce((a, x) => a + x[1], 0);
          const modelName = rs.find((r) => r.model)?.model || 'Model not recorded';

          return (
            <div key={c} className="panel" style={{ marginBottom: '14px' }}>
              <div className="panel-head">
                <div>
                  <h2>Chassis {c}</h2>
                  <span className="sub">
                    {modelName} · {fittedCount} unit(s) fitted
                  </span>
                </div>
              </div>

              <Table
                columns={[
                  { label: 'Date', format: (v, r) => fmtDT(r.ts) },
                  { label: 'Type', render: (r) => <MovementBadge type={r.type} /> },
                  {
                    label: 'Part',
                    render: (r) => (
                      <span>
                        <b>{r.partCode}</b> {r.partName}
                      </span>
                    ),
                  },
                  { label: 'Qty', num: true, format: (v, r) => String(-r.qty) },
                  { label: 'Challan', format: (v, r) => r.challanNo || '-' },
                  { label: 'Requested by', format: (v, r) => r.requestedBy || '-' },
                  { label: 'Issued by', format: (v, r) => r.issuedBy || r.userName },
                ]}
                data={rs}
              />
            </div>
          );
        })
      ) : (
        <div className="empty" style={{ marginBottom: '18px' }}>
          No parts found for chassis containing "{q}".
        </div>
      );
  }

  const openDestModal = (destId?: string) => {
    const existing = destId ? destById(destId, db) : null;

    openModal({
      title: existing ? 'Edit destination' : 'Add destination',
      body: (
        <form
          id="f-dest"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form));
            if (existing) data.id = existing.id;

            try {
              const res = apiCall('saveDestination', data);
              closeModal();
              showToast((existing ? 'Saved ' : 'Created ') + res.name);
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          }}
        >
          <div className="form-grid">
            <label className="field span-2">
              Destination name <span className="req">*</span>
              <input
                name="name"
                defaultValue={existing?.name || ''}
                required
                placeholder="e.g. Sales display wall"
              />
            </label>

            <label className="field">
              Type <span className="req">*</span>
              <select name="type" defaultValue={existing?.type || 'display'} required>
                {Object.entries(DEST_TYPES).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field span-2">
              Notes
              <textarea
                name="note"
                rows={2}
                defaultValue={existing?.note || ''}
                placeholder="Optional description"
              />
            </label>
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
                  apiCall('setDestinationActive', existing.id, !existing.active);
                  closeModal();
                  showToast(
                    existing.name +
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
          <button type="submit" form="f-dest" className="btn primary">
            Save destination
          </button>
        </>
      ),
    });
  };

  const openDestDetail = (dest: Destination) => {
    const hold = h[dest.id] || {};
    const heldItems = Object.entries(hold)
      .filter(([_, q]) => q > 0)
      .map(([partId, qty]) => {
        const p = partById(partId, db);
        return {
          partId,
          partCode: p?.partCode || partId,
          partName: p?.name || 'Unknown part',
          qty,
        };
      });

    openModal({
      title: dest.name,
      size: 'wide',
      body: (
        <div>
          <div className="kv" style={{ marginBottom: '18px' }}>
            <div>
              <div className="k">Type</div>
              <div className="v">{DEST_TYPES[dest.type]}</div>
            </div>
            <div>
              <div className="k">Total units held / fitted</div>
              <div className="v" style={{ fontSize: '24px', color: 'var(--gold-2)' }}>
                {heldItems.reduce((a, b) => a + b.qty, 0)}
              </div>
            </div>
            <div>
              <div className="k">Unique parts</div>
              <div className="v">{heldItems.length}</div>
            </div>
          </div>

          <div className="section-title">Stock Currently Held at Destination</div>
          <Table
            columns={[
              { label: 'Part code', key: 'partCode' },
              { label: 'Part name', key: 'partName' },
              { label: 'Quantity held', key: 'qty', num: true },
            ]}
            data={heldItems}
            emptyText="No stock currently held at this destination."
          />
        </div>
      ),
      foot: can('destinations_edit') ? (
        <button
          className="btn"
          onClick={() => {
            closeModal();
            openDestModal(dest.id);
          }}
        >
          Edit destination
        </button>
      ) : undefined,
    });
  };

  const destinations = db.destinations.filter((d) => d.active !== false);

  return (
    <div>
      <section className="panel" style={{ marginBottom: '18px' }}>
        <h2>Chassis lookup</h2>
        <p className="hint">
          Every part ever fitted to a bike. Enter the full chassis number or just the last 4.
        </p>

        <form
          className="toolbar"
          style={{ margin: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="search">
            <Bike size={18} className="ic" />
            <input
              value={chassisQuery}
              onChange={(e) => setChassisQuery(e.target.value)}
              placeholder="e.g. 8F21"
              style={{ textTransform: 'uppercase' }}
              enterKeyHint="search"
            />
          </div>

          {chassisQuery && (
            <button
              className="btn ghost"
              type="button"
              onClick={() => setChassisQuery('')}
            >
              Clear
            </button>
          )}
        </form>
      </section>

      {chassisBlock}

      <div className="panel-head">
        <h2>Destinations</h2>
        {can('destinations_edit') && (
          <button className="btn" onClick={() => openDestModal()}>
            <Plus size={18} /> Add destination
          </button>
        )}
      </div>

      <p className="hint">
        Displays, display bikes and offsite storage are not warehouses. Stock issued to them is shown here as "currently held" until it is returned.
      </p>

      <div className="cards">
        {destinations.map((d) => {
          const hold = h[d.id] || {};
          const units = Object.values(hold).reduce((a, b) => a + Math.max(b, 0), 0);
          const linesCount = Object.values(hold).filter((x) => x > 0).length;
          const isSale = ['customer_vehicle', 'counter_sale'].includes(d.type);

          return (
            <div key={d.id} className="card" onClick={() => openDestDetail(d)}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <h3>{d.name}</h3>
                <Badge
                  text={DEST_TYPES[d.type]}
                  color={isSale ? 'green' : d.type === 'display' ? 'gold' : 'blue'}
                />
              </div>

              <p>
                {isSale
                  ? 'Stock fitted or sold to customers.'
                  : 'Stock currently sitting here, issued from the warehouse.'}
              </p>

              <div className="foot">
                <div>
                  <div className="big-num">{units}</div>
                  <div className="sub">
                    {isSale
                      ? 'units issued, net of returns'
                      : `units held · ${linesCount} part(s)`}
                  </div>
                </div>
                <MapPin size={22} color="var(--gold)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
