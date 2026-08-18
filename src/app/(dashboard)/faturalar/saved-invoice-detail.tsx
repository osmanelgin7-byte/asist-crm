"use client";
import { apiFetch, downloadFile } from "@/lib/api-client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, Trash2, X } from "lucide-react";
import { Button } from "@/components/button";
import {
  Card, CardBody, CardHeader,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell,
} from "@/components/ui/card";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { workOrderStatusLabels, workOrderStatusColors } from "@/lib/permissions";
import { domainLabels } from "@/lib/domain";
import { groupOrdersByJobType } from "@/lib/invoice-job-groups";

interface CompanyInfo {
  id: string;
  name: string;
  shortCode: string | null;
  city: string | null;
  address: string | null;
}

export interface SavedInvoiceItem {
  id: string;
  ticketNo: string;
  asistansDosyaNo: string | null;
  title: string;
  jobType: string;
  status: string;
  invoiceAmount: number;
  completedAt: string | null;
  reportedAt: string;
  insuranceCompany: CompanyInfo;
  repairItems: { description: string; amount: number }[];
}

export interface SavedInvoiceDetail {
  id: string;
  invoiceNo: string;
  brand: string;
  totalAmount: number;
  issuedAt: string;
  dueDate: string | null;
  isPaid: boolean;
  itemCount: number;
  items: SavedInvoiceItem[];
}

export function SavedInvoiceDetailPanel({
  invoice,
  canWrite,
  jobTypeLabelMap,
  onClose,
  onSaved,
  onDeleted,
}: {
  invoice: SavedInvoiceDetail;
  canWrite: boolean;
  jobTypeLabelMap: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [dueDate, setDueDate] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : "");
    setIsPaid(invoice.isPaid);
    setError(null);
  }, [invoice]);

  const grouped = useMemo(
    () => groupOrdersByJobType(invoice.items, jobTypeLabelMap),
    [invoice.items, jobTypeLabelMap]
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/firm-invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: dueDate || null,
          isPaid,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Kaydedilemedi.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `${invoice.invoiceNo} numaralı fatura silinsin mi?\n\nFaturadaki ${invoice.itemCount} iş tekrar tamamlanan işler listesine döner.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/firm-invoices/${invoice.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Fatura silinemedi.");
        return;
      }
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  async function downloadExcel() {
    try {
      await downloadFile(`/api/firm-invoices/${invoice.id}/export`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Excel indirilemedi.");
    }
  }

  return (
    <Card className="mb-6 border-indigo-100 ring-1 ring-indigo-100">
      <CardHeader
        title={`${invoice.invoiceNo} — Fatura İçeriği`}
        action={
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          >
            <X className="h-4 w-4" /> Kapat
          </button>
        }
      />
      <CardBody className="space-y-6">
        <div className="grid gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-zinc-500">Firma</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900">{invoice.brand}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Fatura Tarihi</p>
            <p className="mt-0.5 text-sm text-zinc-800">{formatDateTime(invoice.issuedAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">Toplam Tutar</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900">{formatCurrency(invoice.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500">İş Sayısı</p>
            <p className="mt-0.5 text-sm text-zinc-800">{invoice.itemCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Ödeme Bilgileri</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor={`due-date-${invoice.id}`} className="mb-1.5 block text-xs font-medium text-zinc-600">
                Vade Tarihi
              </label>
              {canWrite ? (
                <input
                  id={`due-date-${invoice.id}`}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <p className="text-sm text-zinc-800">{dueDate ? formatDate(dueDate) : "—"}</p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-zinc-600">Ödeme Durumu</p>
              {canWrite ? (
                <div className="inline-flex rounded-xl bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => setIsPaid(false)}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                      !isPaid
                        ? "bg-white text-amber-800 shadow-sm ring-1 ring-amber-100"
                        : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Ödenmedi
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaid(true)}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                      isPaid
                        ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100"
                        : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    Ödendi
                  </button>
                </div>
              ) : (
                <span
                  className={cn(
                    "inline-flex rounded-lg px-3 py-1.5 text-sm font-semibold",
                    isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                  )}
                >
                  {isPaid ? "Ödendi" : "Ödenmedi"}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {canWrite && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="accent" onClick={() => void handleSave()} disabled={saving || deleting}>
                {saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
              </Button>
              <Button type="button" variant="secondary" onClick={downloadExcel} disabled={deleting}>
                <FileSpreadsheet className="h-4 w-4" /> Excel İndir
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleDelete()}
                disabled={saving || deleting}
                className="text-red-700 ring-red-100 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Siliniyor…" : "Faturayı Sil"}
              </Button>
            </div>
          )}
          {!canWrite && (
            <div className="mt-4">
              <Button type="button" variant="secondary" onClick={downloadExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Excel İndir
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Hizmet Türüne Göre İşler</p>
          {grouped.map(({ jobType, label, orders, total }) => (
            <Card key={jobType}>
              <CardHeader
                title={label}
                action={
                  <span className="text-sm font-semibold text-indigo-700">
                    Toplam Tutar: {formatCurrency(total)}
                  </span>
                }
              />
              <CardBody flush>
                <DataTable>
                  <DataTableHead>
                    <DataTableHeader>{domainLabels.workOrder.assistanceFileNo}</DataTableHeader>
                    <DataTableHeader>{domainLabels.insuranceCompany.one}</DataTableHeader>
                    <DataTableHeader>İş</DataTableHeader>
                    <DataTableHeader>Durum</DataTableHeader>
                    <DataTableHeader>Tarih</DataTableHeader>
                    <DataTableHeader>Tutar (₺)</DataTableHeader>
                  </DataTableHead>
                  <DataTableBody>
                    {orders.map((o) => (
                      <DataTableRow key={o.id}>
                        <DataTableCell>
                          <span className="font-mono text-xs font-semibold">{o.asistansDosyaNo || "—"}</span>
                        </DataTableCell>
                        <DataTableCell className="text-xs text-zinc-600">
                          {o.insuranceCompany.shortCode
                            ? `${o.insuranceCompany.shortCode} — ${o.insuranceCompany.name}`
                            : o.insuranceCompany.name}
                        </DataTableCell>
                        <DataTableCell>
                          <div className="font-medium text-zinc-900">{o.title}</div>
                          {o.repairItems.length > 0 && (
                            <div className="mt-1 text-xs text-zinc-400">
                              {o.repairItems.map((i) => i.description).join(" · ")}
                            </div>
                          )}
                        </DataTableCell>
                        <DataTableCell>
                          <Badge className={workOrderStatusColors[o.status]}>
                            {workOrderStatusLabels[o.status] ?? o.status}
                          </Badge>
                        </DataTableCell>
                        <DataTableCell className="text-xs text-zinc-500">
                          {o.completedAt ? formatDateTime(o.completedAt) : formatDateTime(o.reportedAt)}
                        </DataTableCell>
                        <DataTableCell className="font-semibold text-zinc-900">
                          {formatCurrency(o.invoiceAmount)}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </CardBody>
            </Card>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
