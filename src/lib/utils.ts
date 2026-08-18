import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} TL`;
}

export function formatCurrencyInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseCurrencyInput(value: string): number {
  const normalized = value.replace(/[^\d,]/g, "").replace(",", ".");
  if (!normalized) return 0;
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} gün`);
  if (hours > 0) parts.push(`${hours} saat`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} dakika`);
  return parts.join(" ");
}

export function durationBetween(start: Date | string, end: Date | string = new Date()): string {
  return formatDuration(new Date(end).getTime() - new Date(start).getTime());
}

export function downloadContentDisposition(filename: string, extension: string): string {
  const base = filename.trim().replace(/[\r\n]/g, "").replace(/[/\\?%*:|"<>]/g, "-").slice(0, 150) || "dosya";
  const asciiFallback =
    base
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "dosya";

  return `attachment; filename="${asciiFallback}.${extension}"; filename*=UTF-8''${encodeURIComponent(`${base}.${extension}`)}`;
}
