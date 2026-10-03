import React from 'react';
import { StockStatus, MovementType, RequestStatus } from '@/types';
import { STATUS_L, MV, REQ_B } from '@/lib/constants';

interface BadgeProps {
  text: string;
  color: string;
}

export const Badge: React.FC<BadgeProps> = ({ text, color }) => {
  return <span className={`badge ${color}`}>{text}</span>;
};

export const StockBadge: React.FC<{ status: StockStatus }> = ({ status }) => {
  const info = STATUS_L[status] || ['Unknown', 'muted'];
  return <Badge text={info[0]} color={info[1]} />;
};

export const MovementBadge: React.FC<{ type: MovementType }> = ({ type }) => {
  const info = MV[type] || [type, 'muted'];
  return <Badge text={info[0]} color={info[1]} />;
};

export const RequestBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
  const color = REQ_B[status] || 'muted';
  return <Badge text={status} color={color} />;
};

export const Chip: React.FC<{ text: string }> = ({ text }) => {
  return <span className="chip">{text}</span>;
};
