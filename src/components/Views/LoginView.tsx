'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      login(username, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in.');
    }
  };

  return (
    <div className="login">
      <section className="login-art">
        <div className="brand">
          <div className="brand-mark">JA</div>
          <div className="brand-text">
            <div className="brand-name">JAIN AUTOMOBILES</div>
            <div className="brand-sub">Authorised Royal Enfield Dealer · Hisar</div>
          </div>
        </div>

        <div>
          <h2>
            Every part. Every bike. <em>Every hand it passed through.</em>
          </h2>
          <p style={{ marginTop: '16px' }}>
            One live stock register for GMA and spares. Know what is on the shelf, where each item went, and who issued it.
          </p>
        </div>

        <div className="login-points">
          <div>
            <b>Live</b>Same numbers at the counter and the stockroom
          </div>
          <div>
            <b>Traceable</b>Chassis, invoice and challan on every issue
          </div>
          <div>
            <b>Sheets ready</b>Every tab exports to Google Sheets
          </div>
        </div>
      </section>

      <section className="login-side">
        <form className="login-card" onSubmit={handleSubmit} autoComplete="on">
          <div className="mvp-flag" style={{ display: 'inline-block' }}>
            Next.js Production System
          </div>
          <h1>Sign in</h1>
          <p className="muted" style={{ margin: 0 }}>
            Use the login your administrator gave you.
          </p>

          <label className="field">
            Username
            <input
              id="login-u"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              required
              autoFocus
            />
          </label>

          <label className="field">
            Password
            <div className="pw-wrap">
              <input
                id="login-p"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {errorMsg && <div className="login-err">{errorMsg}</div>}

          <button className="btn primary" type="submit">
            Sign in
          </button>

          <div className="login-note">
            Sample log-in accounts: <b>superadmin</b> (pass: Jain@11614) or <b>salesmgr</b>, <b>servicemgr</b>, <b>warehouse</b>, <b>store</b>, <b>sales</b> (pass: Demo@2026).
          </div>
        </form>
      </section>
    </div>
  );
};
