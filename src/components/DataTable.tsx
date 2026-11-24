import type { QueryResult } from '../types/sql';

interface DataTableProps {
  result: QueryResult;
  compact?: boolean;
  maxHeightClass?: string;
  highlightMismatchMap?: Map<string, boolean>;
}

export function DataTable({
  result,
  compact = false,
  maxHeightClass = 'h-full',
  highlightMismatchMap,
}: DataTableProps) {
  if (result.columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-xs text-[#63636e]">
        No tabular rows returned.
      </div>
    );
  }

  return (
    <div className={`w-full overflow-auto ${maxHeightClass}`}>
      <table className="w-full border-collapse text-left font-mono text-[12px] tabular-nums">
        <thead className="sticky top-0 z-10 bg-[#131317] shadow-[0_1px_0_0_#24242c]">
          <tr>
            <th className="w-10 select-none border-r border-[#1f1f26] px-2.5 py-1.5 text-right text-[10.5px] font-normal text-[#63636e]">
              #
            </th>
            {result.columns.map((col, idx) => (
              <th
                key={`${col}-${idx}`}
                className={`whitespace-nowrap border-r border-[#1f1f26] last:border-r-0 font-medium text-[#d4d4d8] ${
                  compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-[11.5px]'
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#18181d]">
          {result.values.length === 0 ? (
            <tr>
              <td
                colSpan={result.columns.length + 1}
                className="px-4 py-8 text-center font-sans text-xs text-[#a1a1aa]"
              >
                Query succeeded and returned <span className="font-mono text-[#ececef]">0</span> rows.
              </td>
            </tr>
          ) : (
            result.values.map((row, rIdx) => (
              <tr key={rIdx} className="transition-colors hover:bg-[#16161b]">
                <td className="select-none border-r border-[#18181d] px-2.5 py-1.5 text-right text-[10.5px] text-[#52525b]">
                  {rIdx + 1}
                </td>
                {row.map((cell, cIdx) => {
                  const isMismatch = highlightMismatchMap?.get(`${rIdx}:${cIdx}`) ?? false;
                  const isNumber = typeof cell === 'number';
                  return (
                    <td
                      key={cIdx}
                      className={`whitespace-nowrap border-r border-[#18181d] last:border-r-0 ${
                        compact ? 'px-2.5 py-1 text-[11.5px]' : 'px-3 py-1.5'
                      } ${isNumber ? 'text-right text-[#e5c07b]' : 'text-[#e4e4e7]'} ${
                        isMismatch
                          ? 'bg-rose-500/15 text-rose-200 ring-1 ring-inset ring-rose-500/40'
                          : ''
                      }`}
                    >
                      {cell === null ? (
                        <span className="italic text-[#5c5c66]">NULL</span>
                      ) : cell instanceof Uint8Array ? (
                        <span className="italic text-[#63636e]">[BLOB {cell.byteLength}B]</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
