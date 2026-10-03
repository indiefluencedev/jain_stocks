'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  LayoutGrid,
  Box,
  FileCheck,
  ArrowDownCircle,
  Bike,
  BarChart3,
  MoreHorizontal,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeRoute, setRoute, openCount, can, openModal, closeModal } = useApp();

  const oc = openCount();
  const showStockIn = can('stock_in');

  const mainNavKeys = [
    'dashboard',
    'inventory',
    'requests',
    showStockIn ? 'stockin' : 'destinations',
  ];

  const handleMore = () => {
    openModal({
      title: 'Navigation Menu',
      size: 'narrow',
      body: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('stockin');
              closeModal();
            }}
          >
            <ArrowDownCircle size={18} /> Stock In
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('challans');
              closeModal();
            }}
          >
            Delivery Challans
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('returns');
              closeModal();
            }}
          >
            Returns
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('destinations');
              closeModal();
            }}
          >
            Destinations &amp; Bikes
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('ledger');
              closeModal();
            }}
          >
            Stock Ledger
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('reports');
              closeModal();
            }}
          >
            Reports
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('users');
              closeModal();
            }}
          >
            Users
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('audit');
              closeModal();
            }}
          >
            Audit Log
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setRoute('settings');
              closeModal();
            }}
          >
            Settings
          </button>
        </div>
      ),
    });
  };

  return (
    <nav className="bottomnav">
      <button
        className={activeRoute === 'dashboard' ? 'on' : ''}
        onClick={() => setRoute('dashboard')}
      >
        <LayoutGrid size={22} />
        <span>Dashboard</span>
      </button>

      <button
        className={activeRoute === 'inventory' ? 'on' : ''}
        onClick={() => setRoute('inventory')}
      >
        <Box size={22} />
        <span>Inventory</span>
      </button>

      <button
        className={activeRoute === 'requests' ? 'on' : ''}
        onClick={() => setRoute('requests')}
      >
        <FileCheck size={22} />
        <span>Requests</span>
        {oc > 0 && <span className="count">{oc}</span>}
      </button>

      {showStockIn ? (
        <button
          className={activeRoute === 'stockin' ? 'on' : ''}
          onClick={() => setRoute('stockin')}
        >
          <ArrowDownCircle size={22} />
          <span>Stock In</span>
        </button>
      ) : (
        <button
          className={activeRoute === 'destinations' ? 'on' : ''}
          onClick={() => setRoute('destinations')}
        >
          <Bike size={22} />
          <span>Bikes</span>
        </button>
      )}

      <button
        className={mainNavKeys.includes(activeRoute) ? '' : 'on'}
        onClick={handleMore}
      >
        <MoreHorizontal size={22} />
        <span>More</span>
      </button>
    </nav>
  );
};
