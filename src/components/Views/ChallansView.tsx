'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { fmtDT, sum, challanReturnable } from '@/lib/store';
import { Table, Column } from '../UI/Table';
import { Chip, Badge } from '../UI/Badge';
import { ChallanPaper } from '../UI/ChallanPaper';
import { FileText, Download, Printer } from 'lucide-react';
import { Challan } from '@/types';

export const ChallansView: React.FC = () => {
  const { db, can, openModal, closeModal } = useApp();

  const challans = db.challans.slice().reverse();

  const openChallanModal = (c: Challan) => {
    openModal({
      title: `Challan ${c.no}`,
      size: 'wide',
      body: (
        <div>
          <ChallanPaper challan={c} settings={db.settings} />
        </div>
      ),
      foot: (
        <button
          className="btn primary"
          onClick={() => {
            if (typeof window !== 'undefined') {
              const printArea = document.getElementById('print-root');
              if (printArea) {
                printArea.innerHTML = '';
                // Render paper HTML to print root
                const container = document.createElement('div');
                container.className = 'paper';
                container.innerHTML = `
                  <div class="p-head">
                    <div>
                      <div class="p-brand">${db.settings.dealership.toUpperCase()}</div>
                      <div class="p-sub">Authorised Royal Enfield Dealer · ${db.settings.branch} · Dealer code ${db.settings.dealerCode}</div>
                    </div>
                    <div class="p-title">DELIVERY CHALLAN<span>Internal stock issue from central warehouse</span></div>
                  </div>
                  <div class="p-meta">
                    <div><div class="k">Challan no</div><div class="v">${c.no}</div></div>
                    <div><div class="k">Date and time</div><div class="v">${fmtDT(c.ts)}</div></div>
                    <div><div class="k">Request no</div><div class="v">${c.requestNo}</div></div>
                    <div><div class="k">Destination</div><div class="v">${c.destinationName}</div></div>
                    <div><div class="k">Chassis</div><div class="v">${c.chassis || '-'}</div></div>
                    <div><div class="k">Bike model</div><div class="v">${c.model || '-'}</div></div>
                    <div><div class="k">Sales invoice</div><div class="v">${c.salesInvoice || '-'}</div></div>
                    <div><div class="k">Customer</div><div class="v">${c.customer || '-'}</div></div>
                  </div>
                  <table>
                    <thead>
                      <tr><th style="width:40px">#</th><th>Part code</th><th>Description</th><th class="r" style="width:70px">Qty</th></tr>
                    </thead>
                    <tbody>
                      ${c.items.map((i, n) => `<tr><td>${n + 1}</td><td>${i.partCode}</td><td>${i.partName}</td><td class="r">${i.qty}</td></tr>`).join('')}
                    </tbody>
                    <tfoot>
                      <tr><td colSpan="3">Total units issued</td><td class="r">${sum(c.items, 'qty')}</td></tr>
                    </tfoot>
                  </table>
                  ${c.remarks ? `<div style="margin-top:14px;font-size:11px;color:#444"><strong>Remarks:</strong> ${c.remarks}</div>` : ''}
                  <div class="p-sign">
                    <div>Issued by (${c.issuedByName})<br/><span style="font-size:10px;color:#777">Store / Warehouse</span></div>
                    <div>Requested by (${c.requestedByName})<br/><span style="font-size:10px;color:#777">Department / Sales</span></div>
                    <div>Received by<br/><span style="font-size:10px;color:#777">Signature &amp; Date</span></div>
                  </div>
                  <div class="p-foot">Computer generated delivery challan · Jain Automobiles · ${db.settings.branch}</div>
                `;
                printArea.appendChild(container);
                window.print();
              }
            }
          }}
        >
          <Printer size={18} /> Print Delivery Challan
        </button>
      ),
    });
  };

  const columns: Column<Challan>[] = [
    {
      label: 'Challan',
      render: (c) => (
        <div>
          <div className="code">{c.no}</div>
          <div className="sub">{fmtDT(c.ts)}</div>
        </div>
      ),
    },
    {
      label: 'Destination',
      render: (c) => (
        <div>
          <div className="strong">{c.destinationName}</div>
          <div className="sub">
            {[
              c.chassis ? `Chassis ${c.chassis}` : '',
              c.model,
              c.salesInvoice ? `Inv ${c.salesInvoice}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
      ),
    },
    {
      label: 'Parts',
      render: (c) => (
        <div>
          {c.items.map((i, idx) => (
            <div key={idx}>
              {i.partCode} × {i.qty}
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Units',
      num: true,
      render: (c) => sum(c.items, 'qty'),
    },
    { label: 'Requested by', render: (c) => c.requestedByName },
    { label: 'Issued by', render: (c) => c.issuedByName },
    {
      label: 'Returned',
      render: (c) => {
        const back = c.items.reduce(
          (a, i) => a + (i.qty - challanReturnable(c.no, i.partId, db)),
          0
        );
        return back > 0 ? (
          <Badge text={`${back} back`} color="blue" />
        ) : (
          <span className="sub">-</span>
        );
      },
    },
    {
      label: '',
      cls: 'actions',
      render: (c) => (
        <button
          className="btn sm"
          onClick={(e) => {
            e.stopPropagation();
            openChallanModal(c);
          }}
        >
          <FileText size={16} /> Open
        </button>
      ),
    },
  ];

  const exportCSV = () => {
    const cols = [
      { label: 'timestamp', k: 'ts', format: (v: any) => new Date(v).toISOString() },
      { label: 'no', k: 'no' },
      { label: 'requestNo', k: 'requestNo' },
      { label: 'destinationName', k: 'destinationName' },
      { label: 'chassis', k: 'chassis' },
      { label: 'model', k: 'model' },
      { label: 'salesInvoice', k: 'salesInvoice' },
      { label: 'customer', k: 'customer' },
      { label: 'requestedByName', k: 'requestedByName' },
      { label: 'issuedByName', k: 'issuedByName' },
      { label: 'remarks', k: 'remarks' },
      { label: 'units', k: 'items', format: (v: any) => sum(v, 'qty') },
    ];

    const csvContent =
      '﻿' +
      [
        cols.map((c) => `"${c.label}"`).join(','),
        ...challans.map((r: any) =>
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
    a.download = `challans_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <div className="toolbar">
        <p className="hint" style={{ margin: 0, flex: 1 }}>
          A challan is created automatically every time stock leaves the warehouse. Open one to print or save it as PDF.
        </p>

        {can('export') && (
          <button className="btn" onClick={exportCSV}>
            <Download size={18} /> CSV
          </button>
        )}
      </div>

      <Table
        columns={columns}
        data={challans}
        emptyText="No challans yet."
        onRowClick={openChallanModal}
      />
    </div>
  );
};
