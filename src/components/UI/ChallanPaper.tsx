import React from 'react';
import { Challan, Settings } from '@/types';
import { fmtDT } from '@/lib/store';

interface ChallanPaperProps {
  challan: Challan;
  settings: Settings;
}

export const ChallanPaper: React.FC<ChallanPaperProps> = ({ challan, settings }) => {
  return (
    <div className="paper">
      <div className="p-head">
        <div>
          <div className="p-brand">{settings.dealership.toUpperCase()}</div>
          <div className="p-sub">
            Authorised Royal Enfield Dealer · {settings.branch} · Dealer code {settings.dealerCode}
          </div>
        </div>
        <div className="p-title">
          DELIVERY CHALLAN
          <span>Internal stock issue from central warehouse</span>
        </div>
      </div>

      <div className="p-meta">
        {[
          ['Challan no', challan.no],
          ['Date and time', fmtDT(challan.ts)],
          ['Request no', challan.requestNo],
          ['Destination', challan.destinationName],
          ['Chassis', challan.chassis || '-'],
          ['Bike model', challan.model || '-'],
          ['Sales invoice', challan.salesInvoice || '-'],
          ['Customer', challan.customer || '-'],
        ].map(([k, v], idx) => (
          <div key={idx}>
            <div className="k">{k}</div>
            <div className="v">{v}</div>
          </div>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>#</th>
            <th>Part code</th>
            <th>Description</th>
            <th className="r" style={{ width: '70px' }}>
              Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{item.partCode}</td>
              <td>{item.partName}</td>
              <td className="r">{item.qty}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total units issued</td>
            <td className="r">
              {challan.items.reduce((a, b) => a + Number(b.qty || 0), 0)}
            </td>
          </tr>
        </tfoot>
      </table>

      {challan.remarks && (
        <div style={{ marginTop: '14px', fontSize: '11px', color: '#444' }}>
          <strong>Remarks:</strong> {challan.remarks}
        </div>
      )}

      <div className="p-sign">
        <div>
          Issued by ({challan.issuedByName})
          <br />
          <span style={{ fontSize: '10px', color: '#777' }}>Store / Warehouse</span>
        </div>
        <div>
          Requested by ({challan.requestedByName})
          <br />
          <span style={{ fontSize: '10px', color: '#777' }}>Department / Sales</span>
        </div>
        <div>
          Received by
          <br />
          <span style={{ fontSize: '10px', color: '#777' }}>Signature &amp; Date</span>
        </div>
      </div>

      <div className="p-foot">
        Computer generated delivery challan · Jain Automobiles · {settings.branch}
      </div>
    </div>
  );
};
