/**
 * @file src/components/Views/RequestsView.tsx
 * @description Stock Requests Pipeline & Fulfillment Management View Component.
 * 
 * Features:
 * 1. Filterable Stock Requests List (Status tabs: All, Open, Approved, Issued, Rejected).
 * 2. Raise Stock Request Modal (`can('create_request')`) targeting specific Destination bikes/workshop bays.
 * 3. Manager Approval & Rejection Actions (`can('approve_request')`).
 * 4. Storekeeper Stock Issue Modal (`can('issue')`) generating Delivery Challans and updating ledger balances.
 * 5. Scoped Visibility for Sales Reps (`sales_rep` only views personal requests).
 * 
 * @module RequestsViewComponent
 */

'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  isIssuable,
  fmtDT,
  sum,
  destById,
  partById,
  resolvePart,
  stockOf,
} from '@/lib/store';
import { DEST_TYPES, MODELS } from '@/lib/constants';
import { Table, Column } from '../UI/Table';
import { RequestBadge, Chip } from '../UI/Badge';
import { LinesEditor, LineItem } from '../UI/LinesEditor';
import { Plus, Check, X, ArrowUpRight } from 'lucide-react';
import { StockRequest, RequestStatus } from '@/types';

interface RequestsViewProps {
  initialDirectIssue?: boolean;
}

/** Stock Requests & Fulfillment View Component */
export const RequestsView: React.FC<RequestsViewProps> = ({

  initialDirectIssue = false,
}) => {
  const { db, user, can, apiCall, showToast, openModal, closeModal, setRoute } = useApp();

  const [tab, setTab] = useState<'open' | 'ready' | 'done' | 'closed' | 'all'>('open');
  const [mineOnly, setMineOnly] = useState(user?.role === 'sales_rep');

  if (!user) return null;

  let requests = db.requests.slice().reverse();

  if (user.role === 'sales_rep' || mineOnly) {
    requests = requests.filter(
      (r) => r.requestedById === user.id || r.createdById === user.id
    );
  }

  const tabFilters: Record<string, (r: StockRequest) => boolean> = {
    open: (r) => ['Requested', 'Approved', 'Partially issued'].includes(r.status),
    ready: (r) => isIssuable(r, db),
    done: (r) => ['Issued', 'Closed short'].includes(r.status),
    closed: (r) => ['Rejected', 'Cancelled'].includes(r.status),
    all: () => true,
  };

  const filteredRequests = requests.filter(tabFilters[tab]);

  const openNewRequestModal = (directIssue = false) => {
    let selectedDestId = '';
    let chassis = '';
    let model = 'Universal';
    let salesInvoice = '';
    let customer = '';
    let remarks = '';
    let requestedById = user.id;
    let lines: LineItem[] = [{ id: '1', partInput: '', qty: 1 }];

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const parsedItems = lines
          .filter((l) => l.partInput.trim())
          .map((l) => {
            const p = resolvePart(l.partInput, db);
            if (!p) throw new Error(`Part not found: "${l.partInput}". Pick it from the list.`);
            const q = parseInt(String(l.qty), 10);
            if (!(q > 0)) throw new Error(`Enter quantity for ${p.partCode}.`);
            return { partId: p.id, qty: q };
          });

        if (!parsedItems.length) throw new Error('Add at least one part with a quantity.');

        const payload = {
          destinationId: selectedDestId,
          chassis,
          model,
          salesInvoice,
          customer,
          items: parsedItems,
          remarks,
          requestedById,
        };

        if (directIssue && can('issue')) {
          const res = apiCall('createAndIssue', payload);
          closeModal();
          showToast(`Request & Challan created (${res.challan ? res.challan.no : res.request.no})`);
        } else {
          const res = apiCall('createRequest', payload);
          closeModal();
          showToast(`Request created (${res.no})`);
        }
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    };

    openModal({
      title: directIssue ? 'Issue stock direct' : 'New stock request',
      size: 'wide',
      body: (
        <form id="f-new-req" onSubmit={handleFormSubmit}>
          <div className="form-grid">
            <label className="field">
              Going to destination <span className="req">*</span>
              <select
                required
                onChange={(e) => (selectedDestId = e.target.value)}
              >
                <option value="">Select destination</option>
                {Object.entries(DEST_TYPES).map(([typeKey, typeLabel]) => {
                  const items = db.destinations.filter((d) => d.type === typeKey && d.active !== false);
                  if (!items.length) return null;
                  return (
                    <optgroup key={typeKey} label={typeLabel}>
                      {items.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>

            <label className="field">
              Requested by
              <select
                defaultValue={user.id}
                onChange={(e) => (requestedById = e.target.value)}
              >
                {db.users
                  .filter((u) => u.active && !u.deleted)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.role}
                    </option>
                  ))}
              </select>
            </label>

            <label className="field">
              Chassis number (last 4+)
              <input
                placeholder="e.g. 8F21"
                style={{ textTransform: 'uppercase' }}
                onChange={(e) => (chassis = e.target.value)}
              />
            </label>

            <label className="field">
              Bike model
              <select onChange={(e) => (model = e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              Sales invoice number
              <input
                placeholder="e.g. JA/SI/0548"
                onChange={(e) => (salesInvoice = e.target.value)}
              />
            </label>

            <label className="field">
              Customer name / note
              <input
                placeholder="Walk-in / Customer name"
                onChange={(e) => (customer = e.target.value)}
              />
            </label>
          </div>

          <LinesEditor checkStock lines={lines} onChange={(newLines) => (lines = newLines)} />

          <label className="field" style={{ marginTop: '14px' }}>
            Remarks
            <textarea
              rows={2}
              placeholder="Optional notes"
              onChange={(e) => (remarks = e.target.value)}
            />
          </label>
        </form>
      ),
      foot: (
        <button type="submit" form="f-new-req" className="btn primary">
          {directIssue ? 'Create & Issue' : 'Submit request'}
        </button>
      ),
    });
  };

  const openIssueModal = (request: StockRequest) => {
    const linesToIssue: Record<string, number> = {};
    request.items.forEach((item) => {
      const remaining = item.qty - item.issued;
      if (remaining > 0) {
        linesToIssue[item.partId] = remaining;
      }
    });

    let remarks = '';

    openModal({
      title: `Issue stock for ${request.no}`,
      body: (
        <div>
          <p className="hint">
            Issuing stock to {request.destinationName}
            {request.chassis ? ` · Chassis ${request.chassis}` : ''}.
          </p>

          <table className="t" style={{ marginBottom: '14px' }}>
            <thead>
              <tr>
                <th>Part</th>
                <th className="num">Requested</th>
                <th className="num">Issued</th>
                <th className="num">Available</th>
                <th className="num" style={{ width: '100px' }}>
                  Issue now
                </th>
              </tr>
            </thead>
            <tbody>
              {request.items.map((item) => {
                const remaining = item.qty - item.issued;
                const avail = stockOf(item.partId, db);

                return (
                  <tr key={item.partId}>
                    <td>
                      <b>{item.partCode}</b>
                      <div className="sub">{item.partName}</div>
                    </td>
                    <td className="num">{item.qty}</td>
                    <td className="num">{item.issued}</td>
                    <td className="num">
                      <b className={avail < remaining ? 'qneg' : 'qpos'}>
                        {avail}
                      </b>
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        defaultValue={remaining}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          linesToIssue[item.partId] = val;
                        }}
                        style={{ width: '80px', textAlign: 'right' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <label className="field">
            Remarks for challan
            <textarea
              rows={2}
              placeholder="e.g. Delivered to workshop"
              onChange={(e) => (remarks = e.target.value)}
            />
          </label>
        </div>
      ),
      foot: (
        <button
          className="btn primary"
          onClick={() => {
            try {
              const lines = Object.entries(linesToIssue)
                .filter(([_, q]) => q > 0)
                .map(([partId, qty]) => ({ partId, qty }));

              const challan = apiCall('issue', request.id, lines, remarks);
              closeModal();
              showToast(`Challan created: ${challan.no}`);
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          }}
        >
          <Check size={18} /> Issue &amp; Generate Challan
        </button>
      ),
    });
  };

  const openRequestDetail = (request: StockRequest) => {
    openModal({
      title: `Request ${request.no}`,
      size: 'wide',
      body: (
        <div>
          <div className="kv" style={{ marginBottom: '18px' }}>
            <div>
              <div className="k">Status</div>
              <div className="v">
                <RequestBadge status={request.status} />
              </div>
            </div>
            <div>
              <div className="k">Destination</div>
              <div className="v">{request.destinationName}</div>
            </div>
            <div>
              <div className="k">Chassis / Bike</div>
              <div className="v">
                {request.chassis ? `Chassis ${request.chassis}` : '-'}{' '}
                {request.model ? `(${request.model})` : ''}
              </div>
            </div>
            <div>
              <div className="k">Sales Invoice</div>
              <div className="v">{request.salesInvoice || '-'}</div>
            </div>
            <div>
              <div className="k">Requested by</div>
              <div className="v">{request.requestedByName}</div>
            </div>
            <div>
              <div className="k">Created on</div>
              <div className="v">{fmtDT(request.ts)}</div>
            </div>
          </div>

          <div className="section-title">Requested Parts</div>
          <table className="t" style={{ marginBottom: '18px' }}>
            <thead>
              <tr>
                <th>Part Code</th>
                <th>Part Name</th>
                <th className="num">Qty Requested</th>
                <th className="num">Qty Issued</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {request.items.map((item) => (
                <tr key={item.partId}>
                  <td>
                    <b>{item.partCode}</b>
                  </td>
                  <td>{item.partName}</td>
                  <td className="num">{item.qty}</td>
                  <td className="num">{item.issued}</td>
                  <td className="num">
                    <b>{item.qty - item.issued}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {request.challans && request.challans.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <div className="section-title">Generated Delivery Challans</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {request.challans.map((chNo) => (
                  <button
                    key={chNo}
                    className="btn sm"
                    onClick={() => {
                      closeModal();
                      setRoute('challans');
                    }}
                  >
                    <Chip text={chNo} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="section-title">Audit History</div>
          <div className="timeline">
            {request.history.map((h, i) => (
              <div key={i}>
                <b>{h.action}</b> by {h.by} · <span>{fmtDT(h.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      foot: (
        <>
          {request.status === 'Requested' && db.settings.approvalRequired && can('request_approve') && (
            <>
              <button
                className="btn danger"
                onClick={() => {
                  const reason = prompt('Reason for rejecting request:');
                  if (reason) {
                    try {
                      apiCall('reject', request.id, reason);
                      closeModal();
                      showToast('Request rejected');
                    } catch (err: any) {
                      showToast(err.message, 'error');
                    }
                  }
                }}
              >
                <X size={16} /> Reject
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  try {
                    apiCall('approve', request.id);
                    closeModal();
                    showToast('Request approved');
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
              >
                <Check size={16} /> Approve
              </button>
            </>
          )}

          {isIssuable(request, db) && can('issue') && (
            <button
              className="btn primary"
              onClick={() => {
                closeModal();
                openIssueModal(request);
              }}
            >
              <ArrowUpRight size={16} /> Issue stock
            </button>
          )}

          {request.status === 'Partially issued' && can('issue') && (
            <button
              className="btn ghost"
              onClick={() => {
                try {
                  apiCall('closeShort', request.id);
                  closeModal();
                  showToast('Request closed short');
                } catch (err: any) {
                  showToast(err.message, 'error');
                }
              }}
            >
              Close short
            </button>
          )}

          {['Requested', 'Approved'].includes(request.status) && (
            <button
              className="btn ghost"
              onClick={() => {
                try {
                  apiCall('cancel', request.id);
                  closeModal();
                  showToast('Request cancelled');
                } catch (err: any) {
                  showToast(err.message, 'error');
                }
              }}
            >
              Cancel request
            </button>
          )}
        </>
      ),
    });
  };

  const columns: Column<StockRequest>[] = [
    {
      label: 'Request',
      render: (r) => (
        <div>
          <div className="code">{r.no}</div>
          <div className="sub">{fmtDT(r.ts)}</div>
        </div>
      ),
    },
    {
      label: 'Going to',
      render: (r) => (
        <div>
          <div className="strong">{r.destinationName}</div>
          <div className="sub">
            {[
              r.chassis ? `Chassis ${r.chassis}` : '',
              r.model,
              r.salesInvoice ? `Inv ${r.salesInvoice}` : '',
            ]
              .filter(Boolean)
              .join(' · ') || DEST_TYPES[r.destType]}
          </div>
        </div>
      ),
    },
    {
      label: 'Parts',
      render: (r) => (
        <div>
          {r.items.map((i, idx) => (
            <div key={idx}>
              {i.partCode} × {i.qty}
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Issued',
      num: true,
      render: (r) => `${sum(r.items, 'issued')} / ${sum(r.items, 'qty')}`,
    },
    { label: 'Requested by', render: (r) => r.requestedByName },
    { label: 'Status', render: (r) => <RequestBadge status={r.status} /> },
    {
      label: '',
      cls: 'actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {isIssuable(r, db) && can('issue') ? (
            <button
              className="btn sm primary"
              onClick={(e) => {
                e.stopPropagation();
                openIssueModal(r);
              }}
            >
              Issue
            </button>
          ) : r.status === 'Requested' && db.settings.approvalRequired && can('request_approve') ? (
            <button
              className="btn sm primary"
              onClick={(e) => {
                e.stopPropagation();
                openRequestDetail(r);
              }}
            >
              Review
            </button>
          ) : (
            <button
              className="btn sm"
              onClick={(e) => {
                e.stopPropagation();
                openRequestDetail(r);
              }}
            >
              View
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="toolbar">
        <div className="tabs">
          {[
            ['open', 'Open'],
            ['ready', 'Ready to issue'],
            ['done', 'Issued'],
            ['closed', 'Rejected / cancelled'],
            ['all', 'All'],
          ].map(([tKey, tLabel]) => {
            const count = requests.filter(tabFilters[tKey]).length;
            return (
              <button
                key={tKey}
                className={tab === tKey ? 'on' : ''}
                onClick={() => setTab(tKey as any)}
              >
                {tLabel} <span className="n">{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {user.role !== 'sales_rep' && (
          <label className="check" style={{ padding: 0 }}>
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
            />{' '}
            Only mine
          </label>
        )}

        {can('request_create') && (
          <button
            className={`btn ${can('issue') ? '' : 'primary'}`}
            onClick={() => openNewRequestModal(false)}
          >
            <Plus size={18} /> New request
          </button>
        )}

        {can('issue') && can('request_create') && (
          <button
            className="btn primary"
            onClick={() => openNewRequestModal(true)}
          >
            <ArrowUpRight size={18} /> Issue now
          </button>
        )}
      </div>

      {db.settings.approvalRequired ? (
        <p className="hint">
          Approval is switched on: a manager must approve each request before the store can issue it.
        </p>
      ) : (
        <p className="hint">
          Approval is switched off: the store can issue any new request straight away. Change this in Settings.
        </p>
      )}

      <Table
        columns={columns}
        data={filteredRequests}
        emptyText="No requests here."
        onRowClick={openRequestDetail}
      />
    </div>
  );
};
