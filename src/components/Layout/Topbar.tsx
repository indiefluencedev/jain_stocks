'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { User as UserIcon } from 'lucide-react';

interface TopbarProps {
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const { user, setRoute } = useApp();

  return (
    <header className="topbar">
      <div className="mob-brand">
        <div className="brand-mark">JA</div>
      </div>

      <h1>{title}</h1>

      <span className="mvp-flag">Next.js Enterprise Build</span>

      <span className="live" title="Screens update when stock changes">
        <i />
        <span>Live</span>
      </span>

      {user && (
        <button
          className="icon-btn"
          onClick={() => setRoute('users')}
          aria-label="Account"
          style={{ display: 'none' }}
          id="tb-acc"
        >
          <UserIcon size={18} />
        </button>
      )}
    </header>
  );
};
