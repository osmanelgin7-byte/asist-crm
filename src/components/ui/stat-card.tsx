import { cn } from "@/lib/utils";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  href?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "warning" | "danger" | "success";
}

const iconVariants = {
  default: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  warning: "bg-amber-50 text-amber-600 ring-amber-100",
  danger: "bg-rose-50 text-rose-600 ring-rose-100",
  success: "bg-emerald-50 text-emerald-600 ring-emerald-100",
};

const valueColors = {
  default: "text-indigo-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
  success: "text-emerald-600",
};

export function StatCard({ label, value, href, icon: Icon, trend, variant = "default" }: StatCardProps) {
  const content = (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200/60 hover:shadow-xl hover:shadow-indigo-500/10">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">{label}</p>
          <p className={cn("mt-3 text-4xl font-extrabold tracking-tight", valueColors[variant])}>{value}</p>
          {trend && <p className="mt-2 text-xs text-zinc-400">{trend}</p>}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1", iconVariants[variant])}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
      {href && (
        <div className="relative mt-5 flex items-center gap-1 text-xs font-bold text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100">
          Detayları gör <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
