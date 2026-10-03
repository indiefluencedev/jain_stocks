'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { ROLES, PERMS } from '@/lib/constants';
import { fmtDT, initials, userById } from '@/lib/store';
import { hasPerm } from '@/lib/ops';
import { Table, Column } from '../UI/Table';
import { Badge } from '../UI/Badge';
import { Plus, Edit2, Key, Check } from 'lucide-react';
import { User, Role } from '@/types';

export const UsersView: React.FC = () => {
  const { db, user: currentUser, apiCall, showToast, openModal, closeModal, ask } = useApp();

  if (!currentUser) return null;

  const usersList = db.users.filter((u) => !u.deleted);

  const openUserModal = (userId?: string) => {
    const existing = userId ? userById(userId, db) : null;
    const availableRoles = (Object.keys(ROLES) as Role[]).filter(
      (r) =>
        r !== 'super_admin' ||
        currentUser.role === 'super_admin' ||
        existing?.role === 'super_admin'
    );

    openModal({
      title: existing ? 'Edit user' : 'Add user',
      body: (
        <div>
          <form
            id="f-user"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = Object.fromEntries(new FormData(form));
              if (existing) data.id = existing.id;

              try {
                const res = apiCall('saveUser', data);
                closeModal();
                showToast((existing ? 'Saved ' : 'Created ') + res.name);
              } catch (err: any) {
                showToast(err.message, 'error');
              }
            }}
          >
            <div className="form-grid">
              <label className="field">
                Full name <span className="req">*</span>
                <input
                  name="name"
                  defaultValue={existing?.name || ''}
                  required
                />
              </label>

              <label className="field">
                Username (for sign-in) <span className="req">*</span>
                <input
                  name="username"
                  defaultValue={existing?.username || ''}
                  required
                  autoCapitalize="none"
                  spellCheck="false"
                />
              </label>

              <label className="field">
                Role <span className="req">*</span>
                <select name="role" defaultValue={existing?.role || 'sales_rep'}>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLES[r].label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Phone
                <input
                  name="phone"
                  defaultValue={existing?.phone || ''}
                  inputMode="tel"
                />
              </label>

              {!existing && (
                <label className="field span-2">
                  Starting password (8+ characters) <span className="req">*</span>
                  <input
                    name="password"
                    type="text"
                    required
                    minLength={8}
                    autoComplete="off"
                    placeholder="Share this with the person privately"
                  />
                </label>
              )}
            </div>
          </form>

          {existing && (
            <div style={{ marginTop: '18px' }}>
              <div className="section-title">Recent sign-ins and actions</div>
              <Table
                columns={[
                  { label: 'When', format: (v, a) => fmtDT(a.ts) },
                  { label: 'Action', key: 'action' },
                  {
                    label: 'Detail',
                    render: (a) => <span className="sub">{a.detail}</span>,
                  },
                ]}
                data={db.audit
                  .filter((a) => a.userId === existing.id)
                  .slice(-8)
                  .reverse()}
                emptyText="No activity yet."
              />
            </div>
          )}
        </div>
      ),
      foot: (
        <>
          {existing && existing.id !== currentUser.id && (
            <>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  try {
                    apiCall('setUserActive', existing.id, !existing.active);
                    closeModal();
                    showToast(
                      existing.name +
                        (existing.active ? ' deactivated' : ' activated')
                    );
                  } catch (err: any) {
                    showToast(err.message, 'error');
                  }
                }}
              >
                {existing.active ? 'Deactivate' : 'Activate'}
              </button>

              <button
                type="button"
                className="btn danger"
                onClick={async () => {
                  const ok = await ask(
                    `Remove ${existing.name}?`,
                    'They can no longer sign in. Everything they did stays in the ledger and audit log.',
                    'Remove user',
                    true
                  );
                  if (ok) {
                    try {
                      apiCall('removeUser', existing.id);
                      closeModal();
                      showToast(`${existing.name} removed`);
                    } catch (err: any) {
                      showToast(err.message, 'error');
                    }
                  }
                }}
              >
                Remove
              </button>
            </>
          )}

          <button type="submit" form="f-user" className="btn primary">
            <Check size={18} /> Save user
          </button>
        </>
      ),
    });
  };

  const handleResetPw = async (userObj: User) => {
    const pw = await ask(
      `Reset password for ${userObj.name}`,
      'Type a new password (8+ characters) and share it with them privately.',
      'Set password',
      false,
      'New password'
    );

    if (pw && typeof pw === 'string') {
      try {
        apiCall('resetPassword', userObj.id, pw);
        showToast(`Password reset for ${userObj.name}`);
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const columns: Column<User>[] = [
    {
      label: 'Name',
      render: (u) => (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="avatar">{initials(u.name)}</div>
          <div>
            <div className="strong">
              {u.name}
              {u.id === currentUser.id && <span className="sub"> (you)</span>}
            </div>
            <div className="sub">@{u.username}</div>
          </div>
        </div>
      ),
    },
    { label: 'Role', render: (u) => ROLES[u.role]?.label || u.role },
    {
      label: 'Status',
      render: (u) =>
        u.active ? (
          <Badge text="Active" color="green" />
        ) : (
          <Badge text="Deactivated" color="muted" />
        ),
    },
    {
      label: 'Last sign-in',
      render: (u) => (u.lastLogin ? fmtDT(u.lastLogin) : <span className="sub">Never</span>),
    },
    {
      label: '',
      cls: 'actions',
      render: (u) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            className="btn sm"
            onClick={(e) => {
              e.stopPropagation();
              openUserModal(u.id);
            }}
          >
            <Edit2 size={16} /> Edit
          </button>

          <button
            className="btn sm ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleResetPw(u);
            }}
          >
            <Key size={16} /> Reset password
          </button>
        </div>
      ),
    },
  ];

  const rolesList = Object.keys(ROLES) as Role[];

  return (
    <div>
      <div className="toolbar">
        <p className="hint" style={{ margin: 0, flex: 1 }}>
          Accounts are created here by the Owner or Super Admin. Nobody can sign up on their own. Removing a user keeps all their history.
        </p>

        <button className="btn primary" onClick={() => openUserModal()}>
          <Plus size={18} /> Add user
        </button>
      </div>

      <Table columns={columns} data={usersList} />

      <div className="section-title">What each role can do</div>

      <div className="table-wrap">
        <table className="t" style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th>Permission</th>
              {rolesList.map((r) => (
                <th key={r} style={{ textAlign: 'center' }}>
                  {ROLES[r].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(PERMS).map(([k, l]) => (
              <tr key={k}>
                <td>{l}</td>
                {rolesList.map((r) => {
                  const allowed = hasPerm({ role: r } as any, k as any);
                  return (
                    <td key={r} style={{ textAlign: 'center' }}>
                      {allowed ? (
                        <span style={{ color: 'var(--green)' }}>✓</span>
                      ) : (
                        <span className="muted">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
