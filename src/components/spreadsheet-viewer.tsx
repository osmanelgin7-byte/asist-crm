"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpreadsheetData } from "@/lib/reference-spreadsheet";

export function SpreadsheetViewer({
  data,
  emptyTitle,
  emptyDescription,
}: {
  data: SpreadsheetData;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const activeSheet = data.sheets[activeSheetIndex] ?? null;

  const columnCount = useMemo(() => {
    if (!activeSheet) return 0;
    return activeSheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  }, [activeSheet]);

  if (data.missing || data.sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-16 text-center">
        <FileSpreadsheet className="h-10 w-10 text-zinc-300" />
        <div>
          <p className="text-sm font-semibold text-zinc-800">{emptyTitle}</p>
          <p className="mt-1 max-w-md text-sm text-zinc-500">{emptyDescription}</p>
        </div>
        <p className="rounded-lg bg-white px-3 py-2 font-mono text-xs text-zinc-500 ring-1 ring-zinc-200">
          data/reference/{data.fileName}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.sheets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {data.sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActiveSheetIndex(index)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                activeSheetIndex === index
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              )}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {activeSheet && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-100">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                {activeSheet.rows.map((row, rowIndex) => (
                  <tr
                    key={`${activeSheet.name}-${rowIndex}`}
                    className={cn(
                      rowIndex === 0 && "bg-zinc-100/90 font-semibold text-zinc-800",
                      rowIndex > 0 && rowIndex % 2 === 0 && "bg-zinc-50/60",
                      rowIndex > 0 && "text-zinc-700"
                    )}
                  >
                    {Array.from({ length: columnCount }, (_, colIndex) => (
                      <td
                        key={colIndex}
                        className="whitespace-nowrap border-b border-r border-zinc-100 px-3 py-2 align-top last:border-r-0"
                      >
                        {row[colIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
