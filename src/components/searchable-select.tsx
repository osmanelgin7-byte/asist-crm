"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterOptions } from "@/lib/locations";

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  resolveOptions?: (query: string) => string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  resolveOptions,
  placeholder = "Ara ve seç…",
  required,
  disabled,
  emptyMessage = "Sonuç bulunamadı",
}: SearchableSelectProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const resolved = resolveOptions ? resolveOptions(query) : filterOptions(options, query);
    if (value && !resolved.includes(value)) {
      return [value, ...resolved];
    }
    return resolved;
  }, [options, query, resolveOptions, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function select(option: string) {
    onChange(option);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-zinc-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      {value && !open ? (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
          <p className="truncate text-sm font-medium text-zinc-900">{value}</p>
          {!disabled ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"
              aria-label={`${label} temizle`}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            id={inputId}
            type="text"
            value={query}
            disabled={disabled}
            required={required && !value}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {open && !disabled ? (
            <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-zinc-400">{emptyMessage}</p>
              ) : (
                filtered.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => select(option)}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50",
                      value === option && "bg-indigo-50 font-medium text-indigo-700"
                    )}
                  >
                    {option}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
