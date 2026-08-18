import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
}: {
  title: string;
  description?: string;
  breadcrumb?: string[];
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 animate-fade-in">
      {breadcrumb && breadcrumb.length > 1 && (
        <nav className="mb-3 flex items-center gap-1 text-xs font-medium text-zinc-400">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={i === breadcrumb.length - 1 ? "text-indigo-600" : ""}>{item}</span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">{title}</h1>
          {description && <p className="mt-2 text-sm text-zinc-500">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
            value === opt.value
              ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25"
              : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50 hover:ring-indigo-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
