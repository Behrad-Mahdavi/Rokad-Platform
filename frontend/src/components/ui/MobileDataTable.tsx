import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './Table';
import { Skeleton } from './Skeleton';
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';

export interface ColumnDef<T> {
  key?: string;
  header: string;
  /**
   * Render function for the cell in desktop table view
   */
  render?: (item: T, index: number) => React.ReactNode;
  cell?: (item: T, index: number) => React.ReactNode;
  /**
   * Priority in mobile card view:
   * 'primary' -> shown in card header / title
   * 'secondary' -> shown in card body
   * 'detail' -> shown inside collapsible details (accordion)
   * 'hidden' -> not shown in mobile card
   */
  mobilePriority?: 'primary' | 'secondary' | 'detail' | 'hidden';
  mobileDetail?: boolean;
  className?: string;
}

export interface MobileDataTableProps<T> {
  data?: T[];
  items?: T[];
  columns: ColumnDef<T>[];
  keyExtractor?: (item: T, index: number) => string;
  primaryField?: (item: T, index: number) => React.ReactNode;
  secondaryField?: (item: T, index: number) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  cardActions?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function MobileDataTable<T>({
  data,
  items,
  columns,
  keyExtractor = (item: any, index: number) => item?.id || item?._id || item?.key || String(index),
  primaryField,
  secondaryField,
  isLoading = false,
  emptyMessage = 'داده‌ای برای نمایش یافت نشد',
  emptyIcon,
  cardActions,
  className = '',
}: MobileDataTableProps<T>) {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const listData: T[] = items || data || [];

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getColKey = (col: ColumnDef<T>, idx: number) => col.key || `col_${idx}_${col.header}`;

  const renderCell = (col: ColumnDef<T>, item: T, index: number) => {
    if (col.cell) return col.cell(item, index);
    if (col.render) return col.render(item, index);
    if (col.key && (item as any)[col.key] !== undefined) return (item as any)[col.key];
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Mobile Loading Skeleton Cards */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48 rounded-md" />
              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Loading Skeleton Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c, idx) => (
                  <TableHead key={getColKey(c, idx)}>{c.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c, idx) => (
                    <TableCell key={getColKey(c, idx)}>
                      <Skeleton className="h-5 w-full max-w-[120px] rounded-md" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Empty state
  if (!listData || listData.length === 0) {
    return (
      <div className="p-8 sm:p-12 bg-white rounded-2xl border border-gray-200/80 shadow-xs text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
          {emptyIcon || <Inbox className="w-6 h-6" />}
        </div>
        <p className="text-sm font-bold text-gray-700">{emptyMessage}</p>
      </div>
    );
  }

  // Split columns for mobile view
  const primaryCols = columns.filter((c) => c.mobilePriority === 'primary');
  const secondaryCols = columns.filter(
    (c) =>
      !c.mobileDetail &&
      (c.mobilePriority === 'secondary' || (!c.mobilePriority && !primaryField))
  );
  const detailCols = columns.filter((c) => c.mobileDetail || c.mobilePriority === 'detail');

  return (
    <div className={`w-full ${className}`}>
      {/* 1. MOBILE VIEW (< 768px): Responsive Tactile Card List */}
      <div className="md:hidden space-y-3">
        {listData.map((item, index) => {
          const key = keyExtractor(item, index);
          const isExpanded = !!expandedKeys[key];

          return (
            <div
              key={key}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 transition-shadow hover:shadow-md space-y-3"
            >
              {/* Card Header */}
              {primaryField || secondaryField ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {primaryField && primaryField(item, index)}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                    {secondaryField && secondaryField(item, index)}
                    {cardActions && cardActions(item, index)}
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {primaryCols.length > 0 ? (
                      primaryCols.map((col, cIdx) => (
                        <div key={getColKey(col, cIdx)} className="text-sm font-bold text-ink-darker break-words">
                          {renderCell(col, item, index)}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm font-bold text-ink-darker">
                        {renderCell(columns[0], item, index)}
                      </div>
                    )}
                  </div>

                  {/* Card Top Actions / Status */}
                  {cardActions && (
                    <div className="shrink-0 flex items-center gap-1.5">
                      {cardActions(item, index)}
                    </div>
                  )}
                </div>
              )}

              {/* Card Body (Secondary Columns) */}
              {secondaryCols.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100">
                  {secondaryCols.map((col, cIdx) => (
                    <div key={getColKey(col, cIdx)} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="text-gray-500 font-medium shrink-0">{col.header}:</span>
                      <span className="font-semibold text-ink-dark truncate">
                        {renderCell(col, item, index)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsible Details (Detail Columns) */}
              {detailCols.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => toggleExpand(key)}
                    className="w-full min-h-[44px] py-1.5 flex items-center justify-between text-xs font-bold text-primary hover:text-primary-dark transition-colors"
                  >
                    <span>{isExpanded ? 'بستن جزئیات تکمیلی' : 'مشاهده جزئیات بیشتر'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-2 text-xs animate-in fade-in">
                      {detailCols.map((col, cIdx) => (
                        <div key={getColKey(col, cIdx)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-gray-500 font-medium">{col.header}:</span>
                          <span className="font-semibold text-ink-dark">
                            {renderCell(col, item, index)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. DESKTOP VIEW (>= 768px): Full Structured Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead key={getColKey(col, idx)} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
              {cardActions && <TableHead className="text-center w-24">عملیات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {listData.map((item, index) => {
              const key = keyExtractor(item, index);
              return (
                <TableRow key={key}>
                  {columns.map((col, idx) => (
                    <TableCell key={getColKey(col, idx)} className={col.className}>
                      {renderCell(col, item, index)}
                    </TableCell>
                  ))}
                  {cardActions && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {cardActions(item, index)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
