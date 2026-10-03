/**
 * @file src/components/UI/Table.tsx
 * @description Generic Reusable Data Table Component.
 * 
 * Provides responsive tabular rendering with mobile card view transformation:
 * - Dynamic column specifications (`Column<T>`).
 * - Custom cell renderers (`render`) and value formatters (`format`).
 * - Row selection/click handling (`onRowClick`).
 * - Empty state fallback text rendering.
 * 
 * @module TableComponent
 */

import React, { ReactNode } from 'react';

/**
 * Table Column Definition Contract.
 */
export interface Column<T> {
  label: string;                        // Header title text
  key?: keyof T;                        // Object property key
  num?: boolean;                        // Align numeric values to the right
  cls?: string;                         // Additional CSS class name
  render?: (row: T) => ReactNode;       // Custom cell JSX rendering callback
  format?: (val: any, row: T) => ReactNode; // Formatter callback for raw value
}

export interface TablePaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (newPage: number) => void;
}

/**
 * Table Component Props Interface.
 */
interface TableProps<T> {
  columns: Column<T>[];                 // Array of column definitions
  data: T[];                            // Array of data row objects
  emptyText?: string;                   // Text displayed when data array is empty
  cards?: boolean;                      // Enable responsive card styling on mobile
  onRowClick?: (row: T) => void;        // Row click event listener
  getRowKey?: (row: T, idx: number) => string | number; // Unique row key generator
  pagination?: TablePaginationInfo;     // Optional pagination state & handler controls
}

/**
 * Reusable Data Table Component.
 */
export function Table<T extends Record<string, any>>({
  columns,
  data,
  emptyText = 'Nothing to show yet.',
  cards = true,
  onRowClick,
  getRowKey,
  pagination,
}: TableProps<T>) {
  if (!data || data.length === 0) {
    return <div className="empty">{emptyText}</div>;
  }

  return (
    <div className="table-wrap">
      <table className={`t ${cards ? 'tcards' : ''}`}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={c.num ? 'num' : ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => {
            const key = getRowKey ? getRowKey(row, rIdx) : rIdx;
            const isClickable = Boolean(onRowClick);

            return (
              <tr
                key={key}
                className={isClickable ? 'click' : ''}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((c, cIdx) => {
                  const isLead = cIdx === 0;
                  const rawVal = c.key ? row[c.key] : undefined;
                  let content: ReactNode = rawVal !== undefined ? String(rawVal) : null;

                  if (c.render) {
                    content = c.render(row);
                  } else if (c.format) {
                    content = c.format(rawVal, row);
                  }

                  return (
                    <td
                      key={cIdx}
                      className={`${c.num ? 'num' : ''} ${isLead ? 'lead' : ''} ${
                        c.cls || ''
                      }`}
                      data-label={c.label}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {pagination && pagination.totalPages > 1 && (
        <div
          className="pagination-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-dim, rgba(255, 255, 255, 0.08))',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div className="sub" style={{ fontSize: '13px' }}>
            Showing page <b>{pagination.page}</b> of <b>{pagination.totalPages}</b> ({pagination.totalRecords} total records)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn sm"
              disabled={!pagination.hasNextPage}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
