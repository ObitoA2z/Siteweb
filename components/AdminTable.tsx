import type { ReactNode } from "react";

type Props = {
  headers: string[];
  rows: ReactNode[][];
  emptyLabel?: string;
};

export function AdminTable({ headers, rows, emptyLabel = "Aucune donnee." }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#2d1e2722] bg-white/85">
      <table className="min-w-full text-sm">
        <thead className="bg-[#f8edf3] text-left text-xs uppercase tracking-wide text-[#6b4a59]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-[#5f4754]" colSpan={headers.length}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-[#2d1e2714]">
                {row.map((cell, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
