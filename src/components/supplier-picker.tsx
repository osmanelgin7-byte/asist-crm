"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { domainLabels } from "@/lib/domain";

export interface SupplierOption {
  id: string;
  firstName: string;
  lastName: string;
  iban: string;
  phone?: string | null;
  balance?: number;
}

interface SupplierPickerProps {
  suppliers: SupplierOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

export function SupplierPicker({ suppliers, value, onChange, label = domainLabels.supplier.one }: SupplierPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = suppliers.find((s) => s.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      const full = `${s.firstName} ${s.lastName}`.toLowerCase();
      return full.includes(q) || s.iban.toLowerCase().includes(q);
    });
  }, [suppliers, query]);

  function select(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>

      {selected && !open ? (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
          <div>
            <p className="text-sm font-medium text-zinc-900">{selected.firstName} {selected.lastName}</p>
            <p className="font-mono text-xs text-zinc-400">{selected.iban}</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Ad, soyad veya IBAN ile ara..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
          {open && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-zinc-400">{domainLabels.supplier.one} bulunamadı</p>
              ) : (
                filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => select(s.id)}
                    className={cn(
                      "flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-50",
                      value === s.id && "bg-indigo-50"
                    )}
                  >
                    <span className="text-sm font-medium text-zinc-900">{s.firstName} {s.lastName}</span>
                    <span className="font-mono text-xs text-zinc-400">{s.iban}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
