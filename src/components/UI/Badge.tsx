/**
 * @file src/components/UI/Badge.tsx
 * @description Status & Movement Type Badge UI Components.
 * 
 * Provides pill badge indicators for:
 * 1. Stock Status Alert levels (`StockBadge`: In stock, Low stock, Out of stock, Overstocked).
 * 2. Movement Types (`MovementBadge`: Opening, Stock in, Issue, Return, Adjustment, Reversal).
 * 3. Stock Request Lifecycle statuses (`RequestBadge`: Requested, Approved, Issued, Rejected).
 * 4. General Tag Chips (`Chip`).
 * 
 * @module BadgeComponent
 */

import React from 'react';
import { StockStatus, MovementType, RequestStatus } from '@/types';
import { STATUS_L, MV, REQ_B } from '@/lib/constants';

interface BadgeProps {
  text: string;
  color: string;
}

/** Generic Badge Pill Component */
export const Badge: React.FC<BadgeProps> = ({ text, color }) => {
  return <span className={`badge ${color}`}>{text}</span>;
};

/** Stock Status Alert Badge Component */
export const StockBadge: React.FC<{ status: StockStatus }> = ({ status }) => {
  const info = STATUS_L[status] || ['Unknown', 'muted'];
  return <Badge text={info[0]} color={info[1]} />;
};

/** Ledger Movement Type Badge Component */
export const MovementBadge: React.FC<{ type: MovementType }> = ({ type }) => {
  const info = MV[type] || [type, 'muted'];
  return <Badge text={info[0]} color={info[1]} />;
};

/** Request Lifecycle Status Badge Component */
export const RequestBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
  const color = REQ_B[status] || 'muted';
  return <Badge text={status} color={color} />;
};

/** Generic Tag Chip Component */
export const Chip: React.FC<{ text: string }> = ({ text }) => {
  return <span className="chip">{text}</span>;
};
