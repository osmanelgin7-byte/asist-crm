"use client";
import { apiFetch, downloadFile } from "@/lib/api-client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Save, Eye, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Input } from "@/components/form-fields";
import {
  Card, CardBody, CardHeader,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell, EmptyState,
} from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { workOrderStatusLabels, workOrderStatusColors } from "@/lib/permissions";
import { Badge } from "@/components/badge";
import { SavedInvoiceDetailPanel, type SavedInvoiceDetail } from "./saved-invoice-detail";
import { domainLabels } from "@/lib/domain";
import { groupOrdersByFirm } from "@/lib/invoice-job-groups";

interface CompanyInfo {
  id: string;
  name: string;
  shortCode: string | null;
  city: string | null;
  address: string | null;
}

export interface InvoiceOrder {
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

function PendingOrderTable({
  orders,
  selectedBrand,
  canWrite,
  selectedOrderIds,
  onToggle,
  jobTypeLabelMap,
}: {
  orders: InvoiceOrder[];
  selectedBrand: string;
  canWrite: boolean;
  selectedOrderIds: Set<string>;
  onToggle: (id: string) => void;
  jobTypeLabelMap: Record<string, string>;
}) {
  return (
    <DataTable>
      <DataTableHead>
        {selectedBrand && canWrite && <DataTableHeader>Seç</DataTableHeader>}
        <DataTableHeader>{domainLabels.workOrder.assistanceFileNo}</DataTableHeader>
        <DataTableHeader>{domainLabels.jobType.one}</DataTableHeader>
        <DataTableHeader>İş</DataTableHeader>
        <DataTableHeader>Durum</DataTableHeader>
        <DataTableHeader>Tarih</DataTableHeader>
        <DataTableHeader>Fatura (₺)</DataTableHeader>
      </DataTableHead>
      <DataTableBody>
        {orders.map((o) => (
          <DataTableRow
            key={o.id}
            className={cn(selectedOrderIds.has(o.id) && "bg-indigo-50/40")}
          >
            {selectedBrand && canWrite && (
              <DataTableCell>
                <input
                  type="checkbox"
                  checked={selectedOrderIds.has(o.id)}
                  onChange={() => onToggle(o.id)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  aria-label={`${o.asistansDosyaNo || o.title} seç`}
                />
              </DataTableCell>
            )}
            <DataTableCell>
              <span className="font-mono text-xs font-semibold">{o.asistansDosyaNo || "—"}</span>
            </DataTableCell>
            <DataTableCell className="text-xs text-zinc-600">
              {jobTypeLabelMap[o.jobType] ?? o.jobType}
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
  );
}

export function InvoicesPanel({
  pendingOrders,
  savedInvoices,
  brands,
  selectedBrand,
  canWrite,
  jobTypeLabelMap,
}: {
  pendingOrders: InvoiceOrder[];
  savedInvoices: SavedInvoiceDetail[];
  brands: string[];
  selectedBrand: string;
  canWrite: boolean;
  jobTypeLabelMap: Record<string, string>;
}) {
  const router = useRouter();
  const [invoiceNo, setInvoiceNo] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);

  const viewingInvoice = savedInvoices.find((inv) => inv.id === viewingInvoiceId) ?? null;

  const firmGroups = useMemo(() => groupOrdersByFirm(pendingOrders), [pendingOrders]);

  useEffect(() => {
    setSelectedOrderIds(new Set());
    setInvoiceNo("");
    setFormError(null);
  }, [selectedBrand]);

  useEffect(() => {
    if (viewingInvoiceId && !savedInvoices.some((inv) => inv.id === viewingInvoiceId)) {
      setViewingInvoiceId(null);
    }
  }, [savedInvoices, viewingInvoiceId]);

  function selectBrand(brand: string) {
    setInvoiceNo("");
    setFormError(null);
    setViewingInvoiceId(null);
    router.push(brand ? `/faturalar?brand=${encodeURIComponent(brand)}` : "/faturalar");
  }

  function toggleOrder(id: string) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function downloadListExcel() {
    const url = selectedBrand
      ? `/api/firm-invoices/export?brand=${encodeURIComponent(selectedBrand)}`
      : "/api/firm-invoices/export";
    try {
      await downloadFile(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Excel indirilemedi.");
    }
  }

  async function handleDeleteInvoice(invoice: SavedInvoiceDetail) {
    const confirmed = window.confirm(
      `${invoice.invoiceNo} numaralı fatura silinsin mi?\n\nFaturadaki ${invoice.itemCount} iş tekrar tamamlanan işler listesine döner.`
    );
    if (!confirmed) return;

    setDeletingInvoiceId(invoice.id);
    try {
      const res = await apiFetch(`/api/firm-invoices/${invoice.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Fatura silinemedi.");
        return;
      }
      if (viewingInvoiceId === invoice.id) setViewingInvoiceId(null);
      router.refresh();
    } finally {
      setDeletingInvoiceId(null);
    }
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBrand) {
      setFormError("Fatura oluşturmak için önce bir firma seçin.");
      return;
    }
    if (selectedOrderIds.size === 0) {
      setFormError("Faturaya en az bir iş seçin.");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/firm-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo: invoiceNo.trim(),
          brand: selectedBrand,
          workOrderIds: [...selectedOrderIds],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Fatura kaydedilemedi.");
        return;
      }
      setInvoiceNo("");
      setSelectedOrderIds(new Set());
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Faturalar" breadcrumb={["Ana Sayfa", "Faturalar"]} />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectBrand("")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-all",
            !selectedBrand ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
          )}
        >
          Tüm Firmalar
        </button>
        {brands.map((brand) => (
          <button
            key={brand}
            type="button"
            onClick={() => selectBrand(brand)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all",
              selectedBrand === brand ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
            )}
          >
            {brand}
          </button>
        ))}
      </div>

      {savedInvoices.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            title="Kayıtlı Faturalar"
            action={
              <button
                type="button"
                onClick={downloadListExcel}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-100 transition-colors hover:bg-indigo-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel İndir
              </button>
            }
          />
          <CardBody flush>
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Fatura No</DataTableHeader>
                <DataTableHeader>Firma</DataTableHeader>
                <DataTableHeader>Tarih</DataTableHeader>
                <DataTableHeader>Vade Tarihi</DataTableHeader>
                <DataTableHeader>Ödeme</DataTableHeader>
                <DataTableHeader>İş Sayısı</DataTableHeader>
                <DataTableHeader>Tutar (₺)</DataTableHeader>
                <DataTableHeader>İşlem</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {savedInvoices.map((inv) => (
                  <DataTableRow
                    key={inv.id}
                    className={cn(viewingInvoiceId === inv.id && "bg-indigo-50/50")}
                  >
                    <DataTableCell><span className="font-mono text-xs font-semibold">{inv.invoiceNo}</span></DataTableCell>
                    <DataTableCell>{inv.brand}</DataTableCell>
                    <DataTableCell className="text-xs text-zinc-500">{formatDateTime(inv.issuedAt)}</DataTableCell>
                    <DataTableCell className="text-xs text-zinc-600">
                      {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                    </DataTableCell>
                    <DataTableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold",
                          inv.isPaid
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-800"
                        )}
                      >
                        {inv.isPaid ? "Ödendi" : "Ödenmedi"}
                      </span>
                    </DataTableCell>
                    <DataTableCell>{inv.itemCount}</DataTableCell>
                    <DataTableCell className="font-semibold">{formatCurrency(inv.totalAmount)}</DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingInvoiceId(viewingInvoiceId === inv.id ? null : inv.id)}
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium",
                            viewingInvoiceId === inv.id
                              ? "text-indigo-700"
                              : "text-zinc-600 hover:text-zinc-900"
                          )}
                        >
                          <Eye className="h-3.5 w-3.5" /> İçeriği Gör
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteInvoice(inv)}
                            disabled={deletingInvoiceId === inv.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingInvoiceId === inv.id ? "Siliniyor…" : "Sil"}
                          </button>
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </CardBody>
        </Card>
      )}

      {viewingInvoice && (
        <SavedInvoiceDetailPanel
          invoice={viewingInvoice}
          pendingOrders={pendingOrders.filter(
            (o) => (o.insuranceCompany.shortCode ?? "") === viewingInvoice.brand
          )}
          canWrite={canWrite}
          jobTypeLabelMap={jobTypeLabelMap}
          onClose={() => setViewingInvoiceId(null)}
          onSaved={() => router.refresh()}
          onDeleted={() => {
            setViewingInvoiceId(null);
            router.refresh();
          }}
        />
      )}

      {selectedBrand && canWrite && pendingOrders.length > 0 && (
        <Card className="mb-6">
          <CardHeader title={`${selectedBrand} — Fatura Oluştur`} />
          <CardBody>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
              )}
              <p className="text-sm text-zinc-500">
                Aşağıdaki listeden faturaya eklenecek işleri tek tek seçin. Seçili: {selectedOrderIds.size} iş.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input
                    label="Fatura Numarası"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="Örn: FAT-2026-001"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="accent"
                  disabled={submitting || !invoiceNo.trim() || selectedOrderIds.size === 0}
                >
                  <Save className="h-4 w-4" />
                  {submitting ? "Kaydediliyor..." : "Faturaya Kaydet"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {!selectedBrand && pendingOrders.length > 0 && (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
          Fatura oluşturmak için yukarıdan bir firma seçin.
        </div>
      )}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        {selectedBrand ? `${selectedBrand} — Tamamlanan İşler` : "Tamamlanan İşler (Firma Bazlı)"}
      </h2>

      {pendingOrders.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState message={selectedBrand ? `${selectedBrand} için tamamlanan iş yok` : "Faturalanacak tamamlanan iş yok"} />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {firmGroups.map(({ firmKey, label, orders: firmOrders }) => (
            <Card key={firmKey}>
              <CardHeader
                title={label}
                action={
                  <span className="text-xs text-zinc-500">{firmOrders.length} iş</span>
                }
              />
              <CardBody flush>
                <PendingOrderTable
                  orders={firmOrders}
                  selectedBrand={selectedBrand}
                  canWrite={canWrite}
                  selectedOrderIds={selectedOrderIds}
                  onToggle={toggleOrder}
                  jobTypeLabelMap={jobTypeLabelMap}
                />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
