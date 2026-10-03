import React, { ReactNode } from 'react';

export interface Column<T> {
  label: string;
  key?: keyof T;
  num?: boolean;
  cls?: string;
  render?: (row: T) => ReactNode;
  format?: (val: any, row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyText?: string;
  cards?: boolean;
  onRowClick?: (row: T) => void;
  getRowKey?: (row: T, idx: number) => string | number;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  emptyText = 'Nothing to show yet.',
  cards = true,
  onRowClick,
  getRowKey,
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
    </div>
  );
}
