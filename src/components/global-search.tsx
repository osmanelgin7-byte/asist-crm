"use client";
import { apiFetch } from "@/lib/api-client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Search, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "work-order" | "insurance-company";
  id: string;
  label: string;
  title: string;
  subtitle: string;
  href: string;
}

import { domainLabels } from "@/lib/domain";

const typeMeta = {
  "work-order": { icon: Wrench, badge: domainLabels.workOrder.one },
  "insurance-company": { icon: Building2, badge: domainLabels.insuranceCompany.one },
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResults((data.results as SearchResult[]) ?? []);
        setActiveIndex(-1);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      void runSearch(query);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, open, runSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function navigateTo(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(result.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      navigateTo(results[activeIndex]);
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 sm:block">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={`Dosya veya ${domainLabels.insuranceCompany.one.toLowerCase()} ara...`}
        className="w-full rounded-2xl border border-zinc-200/80 bg-white/70 py-2.5 pl-10 pr-10 text-sm text-zinc-700 placeholder:text-zinc-400 shadow-sm backdrop-blur-sm transition-all focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        autoComplete="off"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Aramayı temizle"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl shadow-indigo-500/10">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Aranıyor…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-500">
              &quot;{query.trim()}&quot; için sonuç bulunamadı.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-2" role="listbox">
              {results.map((result, index) => {
                const meta = typeMeta[result.type];
                const Icon = meta.icon;
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => navigateTo(result)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                        index === activeIndex ? "bg-indigo-50" : "hover:bg-zinc-50"
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-indigo-700">
                            {result.label}
                          </span>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                            {meta.badge}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium text-zinc-900">{result.title}</p>
                        <p className="truncate text-xs text-zinc-500">{result.subtitle}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
