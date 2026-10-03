'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { X } from 'lucide-react';

export const ModalRoot: React.FC = () => {
  const { modal, closeModal, askModal } = useApp();
  const [askInputValue, setAskInputValue] = useState('');

  if (askModal) {
    return (
      <div
        className="overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) askModal.resolve(null);
        }}
      >
        <div
          className="modal narrow"
          role="dialog"
          aria-modal="true"
          aria-label={askModal.title}
        >
          <div className="modal-head">
            <h2>{askModal.title}</h2>
            <button
              className="icon-btn"
              onClick={() => askModal.resolve(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="modal-body">
            <p style={{ margin: '0 0 12px' }}>{askModal.msg}</p>
            {askModal.withInput && (
              <label className="field">
                {askModal.withInput}
                <textarea
                  rows={3}
                  value={askInputValue}
                  onChange={(e) => setAskInputValue(e.target.value)}
                  autoFocus
                />
              </label>
            )}
          </div>
          <div className="modal-foot">
            <button
              className="btn ghost"
              onClick={() => askModal.resolve(null)}
            >
              Cancel
            </button>
            <button
              className={`btn ${askModal.danger ? 'danger' : 'primary'}`}
              onClick={() => {
                const resVal = askModal.withInput ? askInputValue : true;
                setAskInputValue('');
                askModal.resolve(resVal);
              }}
            >
              {askModal.okLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!modal) return null;

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className={`modal ${modal.size || ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={modal.title}
      >
        <div className="modal-head">
          <h2>{modal.title}</h2>
          {modal.headExtra}
          <button className="icon-btn" onClick={closeModal} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{modal.body}</div>
        {modal.foot && <div className="modal-foot">{modal.foot}</div>}
      </div>
    </div>
  );
};
