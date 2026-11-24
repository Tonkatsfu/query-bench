import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Play,
  Table2,
} from 'lucide-react';
import { SCHEMA_METADATA } from '../data/seed';
import type { QueryResult } from '../types/sql';
import { DataTable } from './DataTable';

interface SchemaExplorerProps {
  rowCounts: Record<string, number | null>;
  onPreviewTable: (tableName: string) => QueryResult | null;
  onRunPreviewInConsole: (tableName: string) => void;
}

export function SchemaExplorer({
  rowCounts,
  onPreviewTable,
  onRunPreviewInConsole,
}: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({
    users: true,
    orders: true,
    order_items: true,
    products: true,
  });
  const [previews, setPreviews] = useState<Record<string, QueryResult | null>>({});

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handlePreview = (tableName: string) => {
    if (previews[tableName]) {
      setPreviews((prev) => ({ ...prev, [tableName]: null }));
      return;
    }
    const res = onPreviewTable(tableName);
    setPreviews((prev) => ({ ...prev, [tableName]: res }));
  };

  const totalRows = Object.values(rowCounts).reduce<number>(
    (acc, val) => acc + (val ?? 0),
    0
  );

  return (
    <div className="divide-y divide-[#1d1d24]">
      {/* Schema Summary Header */}
      <div className="flex items-baseline justify-between gap-2 px-5 py-3.5">
        <div>
          <h2 className="text-xs font-semibold text-[#ececef]">
            E-Commerce &amp; SaaS Database
          </h2>
          <p className="mt-0.5 text-[11.5px] text-[#71717a]">
            9 relational tables · 2025–2026 transactional, SaaS &amp; funnel data
          </p>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-[#a1a1aa]">
          {totalRows} rows
        </span>
      </div>

      {/* Table Tree */}
      {SCHEMA_METADATA.map((table) => {
        const isOpen = !!expandedTables[table.name];
        const count = rowCounts[table.name];
        const preview = previews[table.name];

        return (
          <div key={table.name}>
            {/* Table Row Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-[#131318] transition-colors">
              <button
                type="button"
                onClick={() => toggleTable(table.name)}
                aria-expanded={isOpen}
                className="flex min-w-0 items-center gap-2 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
                )}
                <Table2 className="h-3.5 w-3.5 shrink-0 text-[#e2a03f]" />
                <span className="font-mono text-xs font-semibold text-[#ececef]">
                  {table.name}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-[#63636e]">
                  {count === null || count === undefined ? '(dropped)' : `(${count})`}
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePreview(table.name)}
                  className={`flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    preview
                      ? 'border-[#e2a03f]/40 bg-[#e2a03f]/10 text-[#e2a03f]'
                      : 'border-[#25252e] bg-[#141418] text-[#a1a1aa] hover:border-[#343440] hover:text-[#ececef]'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>{preview ? 'Hide' : 'Preview 5 Rows'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRunPreviewInConsole(table.name)}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[#25252e] bg-[#141418] text-[#a1a1aa] transition-colors hover:border-[#343440] hover:text-[#ececef]"
                  title={`Run SELECT * FROM ${table.name} LIMIT 5 in console`}
                  aria-label={`Query ${table.name} in console`}
                >
                  <Play className="h-2.5 w-2.5 fill-current" />
                </button>
              </div>
            </div>

            {/* Columns List */}
            {isOpen && (
              <div className="bg-[#0b0b0e] pb-2">
                <p className="px-5 py-1.5 text-[11.5px] text-[#71717a]">
                  {table.description}
                </p>
                <ul className="divide-y divide-[#16161b] px-5">
                  {table.columns.map((col) => (
                    <li
                      key={col.name}
                      className="flex items-center justify-between gap-3 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 shrink-0 font-mono text-[10px] font-semibold">
                          {col.isPrimaryKey ? (
                            <span className="text-[#e2a03f]" title="Primary Key">
                              PK
                            </span>
                          ) : col.foreignKey ? (
                            <span
                              className="text-[#7aa2f7]"
                              title={`Foreign key → ${col.foreignKey.table}.${col.foreignKey.column}`}
                            >
                              FK
                            </span>
                          ) : (
                            <span className="text-[#3f3f46]">·</span>
                          )}
                        </span>
                        <code className="font-mono text-[12px] text-[#e4e4e7]">
                          {col.name}
                        </code>
                        {col.foreignKey && (
                          <span className="hidden sm:inline font-mono text-[10.5px] text-[#63636e]">
                            → {col.foreignKey.table}.{col.foreignKey.column}
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        {col.note && (
                          <span className="hidden sm:inline text-[11px] text-[#63636e]">
                            {col.note}
                          </span>
                        )}
                        <span className="w-16 text-right font-mono text-[10.5px] text-[#8e8e98]">
                          {col.type}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inline 5-Row Preview */}
            {preview && (
              <div className="border-t border-[#202028] bg-[#09090b]">
                <div className="flex items-center justify-between px-5 py-1.5 bg-[#121216] border-b border-[#1c1c23]">
                  <code className="font-mono text-[11px] text-[#a1a1aa]">
                    SELECT * FROM {table.name} LIMIT 5;
                  </code>
                  <span className="font-mono text-[10.5px] tabular-nums text-[#63636e]">
                    {preview.rowCount} rows
                  </span>
                </div>
                <DataTable result={preview} compact maxHeightClass="max-h-48" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
