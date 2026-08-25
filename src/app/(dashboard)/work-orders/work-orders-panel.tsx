"use client";
import { apiFetch, downloadFile } from "@/lib/api-client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Download, FileSpreadsheet, Wrench, CheckCircle2,
  Building2, Eye, Trash2, Search,
} from "lucide-react";
import { PageHeader, FilterPills } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import {
  Card, CardBody, CardHeader,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell, EmptyState,
} from "@/components/ui/card";
import { domainLabels } from "@/lib/domain";
import {
  workOrderStatusLabels, workOrderStatusColors,
} from "@/lib/permissions";
import { formatDateTime, cn } from "@/lib/utils";
import {
  workOrderStatusFlow,
  isWorkOrderClosed,
} from "@/lib/work-order-status";
import { shouldHighlightMissingInvoicePrice } from "@/lib/firm-invoice";
import { responsibleSelectOptions, type ResponsibleOption } from "@/lib/responsibles";
import type { InsuranceCompanyContactData } from "@/lib/insurance-company";

interface InsuranceCompany extends InsuranceCompanyContactData {
  id: string;
  name: string;
}

interface RepairItem {
  id: string;
  description: string;
  amount: number;
}

interface WorkOrder {
  id: string;
  ticketNo: string;
  title: string;
  asistansDosyaNo: string | null;
  insuredFirstName: string | null;
  insuredLastName: string | null;
  insuredPhone: string | null;
  insuredAddress: string | null;
  insuredCity: string | null;
  insuredDistrict: string | null;
  description: string | null;
  jobType: string;
  status: string;
  priority: string;
  reportedAt: string;
  appointmentAt: string | null;
  completedAt: string | null;
  invoiceAmount: number;
  supplierCost: number;
  hasFirmInvoice: boolean;
  supplierId: string | null;
  supplier: { id: string; firstName: string; lastName: string; iban: string; balance: number } | null;
  repairItems: RepairItem[];
  insuranceCompany: InsuranceCompany;
  assignedTo: { id: string; name: string } | null;
}

interface WorkOrdersPanelProps {
  activeTab: "open" | "completed";
  orders: WorkOrder[];
  counts: { open: number; completed: number };
  canWrite: boolean;
  responsibles: ResponsibleOption[];
  jobTypeOptions: { value: string; label: string }[];
}

const tabs = [
  { id: "open" as const, label: "Açık Kayıtlar" },
  { id: "completed" as const, label: "Tamamlanan" },
];

const openTabStatuses = ["YENI_IS", "ISLEMDE"] as const;
const completedTabStatuses = ["TAMAMLANDI", "SERVIS_BEDELI_ILE_TAMAMLANDI", "IPTAL"] as const;

function insuredFullName(order: Pick<WorkOrder, "insuredFirstName" | "insuredLastName">) {
  return [order.insuredFirstName, order.insuredLastName].filter(Boolean).join(" ") || "—";
}

function jobTypeLabel(code: string, options: { value: string; label: string }[]) {
  return options.find((item) => item.value === code)?.label ?? code;
}

function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WorkOrdersPanel({
  activeTab,
  orders,
  counts,
  canWrite,
  responsibles,
  jobTypeOptions,
}: WorkOrdersPanelProps) {
  const router = useRouter();
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dosyaSearch, setDosyaSearch] = useState("");

  const responsibleFilterOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      ...responsibles.map((r) => ({ value: r.id, label: r.name })),
      { value: "unassigned", label: "Atanmamış" },
    ],
    [responsibles]
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "all", label: "Tümü" },
      ...(activeTab === "completed" ? completedTabStatuses : openTabStatuses).map((status) => ({
        value: status,
        label: workOrderStatusLabels[status] ?? status,
      })),
    ],
    [activeTab]
  );

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (responsibleFilter !== "all") {
      if (responsibleFilter === "unassigned") result = result.filter((o) => !o.assignedTo);
      else result = result.filter((o) => o.assignedTo?.id === responsibleFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    const q = dosyaSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const haystack = [
          o.asistansDosyaNo,
          o.title,
          o.ticketNo,
          o.insuredFirstName,
          o.insuredLastName,
          o.insuredPhone,
          o.insuranceCompany.name,
          o.insuranceCompany.shortCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result;
  }, [orders, responsibleFilter, statusFilter, dosyaSearch]);

  const activeResponsibleLabel =
    responsibleFilterOptions.find((o) => o.value === responsibleFilter)?.label ?? "Tümü";
  const activeStatusLabel =
    statusFilterOptions.find((o) => o.value === statusFilter)?.label ?? "Tümü";
  const hasActiveFilters =
    responsibleFilter !== "all" || statusFilter !== "all" || dosyaSearch.trim().length > 0;

  function switchTab(tab: "open" | "completed") {
    setStatusFilter("all");
    setDosyaSearch("");
    router.push(tab === "completed" ? "/work-orders?tab=completed" : "/work-orders");
  }

  function refresh() {
    router.refresh();
  }

  async function updateStatus(id: string, status: string) {
    if (!workOrderStatusFlow.includes(status as (typeof workOrderStatusFlow)[number])) return;

    const res = await apiFetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) return;

    if (isWorkOrderClosed(status)) {
      switchTab("completed");
    } else {
      switchTab("open");
    }
    refresh();
  }

  async function updateAssignee(id: string, nextAssignedToId: string) {
    const res = await apiFetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: nextAssignedToId || null }),
    });
    if (res.ok) refresh();
  }

  async function updateAppointment(id: string, value: string) {
    const res = await apiFetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentAt: value ? new Date(value).toISOString() : null }),
    });
    if (res.ok) refresh();
  }

  async function handleDelete(order: WorkOrder) {
    if (!confirm(`"${order.ticketNo}" kaydını silmek istediğinize emin misiniz?`)) return;

    const res = await apiFetch(`/api/work-orders/${order.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : "Kayıt silinemedi.");
      return;
    }
    refresh();
  }

  async function downloadExcel(type: "open" | "completed" | "all") {
    try {
      await downloadFile(`/api/work-orders/export?type=${type}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Excel indirilemedi.");
    }
  }

  return (
    <div>
      <PageHeader
        title={domainLabels.workOrder.many}
        description={`Açık ve kapanan ${domainLabels.workOrder.many}`}
        breadcrumb={["Ana Sayfa", domainLabels.workOrder.many]}
        action={
          canWrite && activeTab === "open" ? (
            <Link href="/work-orders/new">
              <Button variant="accent">
                <Plus className="h-4 w-4" /> Yeni Kayıt
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Açık Kayıt" value={counts.open} icon={Wrench} variant="warning" />
        <StatCard label="Tamamlanan" value={counts.completed} icon={CheckCircle2} variant="success" />
      </div>

      <Card className="mb-6">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">Excel Dışa Aktarma</p>
            <p className="text-xs text-zinc-500">Açık işler, tamamlanan veya genel durum raporu indirin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => downloadExcel("open")}>
              <Download className="h-4 w-4" /> Açık İşler
            </Button>
            <Button variant="secondary" size="sm" onClick={() => downloadExcel("completed")}>
              <Download className="h-4 w-4" /> Tamamlanan
            </Button>
            <Button variant="secondary" size="sm" onClick={() => downloadExcel("all")}>
              <FileSpreadsheet className="h-4 w-4" /> Genel Durum
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1">
        {tabs.map((tab) => {
          const count = tab.id === "open" ? counts.open : counts.completed;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {tab.label}
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeTab === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-zinc-200/80 text-zinc-600"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title={activeTab === "completed" ? domainLabels.workOrder.completed : domainLabels.workOrder.open}
        />
        <CardBody>
          <div className="mb-5">
            <label htmlFor="dosya-search" className="mb-1.5 block text-xs font-medium text-zinc-600">
              Dosya no / asistans no ara
            </label>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="dosya-search"
                type="search"
                value={dosyaSearch}
                onChange={(e) => setDosyaSearch(e.target.value)}
                placeholder="Asistans dosya no, dosya no, sigortalı..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-800 outline-none transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            {dosyaSearch.trim() && (
              <p className="mt-2 text-xs text-zinc-500">
                &quot;{dosyaSearch.trim()}&quot; için {filteredOrders.length} kayıt
                {filteredOrders.length > 1 ? " (aynı numara birden fazla olabilir)" : ""}
              </p>
            )}
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Koordinatöre göre filtreleyin — seçili:{" "}
            <span className="font-semibold text-zinc-700">{activeResponsibleLabel}</span>
            {responsibleFilter !== "all" && (
              <span className="text-zinc-400"> · {filteredOrders.length} kayıt</span>
            )}
          </p>
          <FilterPills
            options={responsibleFilterOptions}
            value={responsibleFilter}
            onChange={setResponsibleFilter}
          />
          <p className="mb-3 mt-5 text-xs text-zinc-500">
            İş durumuna göre filtreleyin — seçili:{" "}
            <span className="font-semibold text-zinc-700">{activeStatusLabel}</span>
            {statusFilter !== "all" && (
              <span className="text-zinc-400"> · {filteredOrders.length} kayıt</span>
            )}
          </p>
          <FilterPills
            options={statusFilterOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </CardBody>
        <CardBody flush className="border-t border-zinc-100">
          {filteredOrders.length === 0 ? (
            <EmptyState
              message={
                orders.length === 0
                  ? activeTab === "completed"
                    ? "Tamamlanan kayıt yok"
                    : "Açık kayıt bulunamadı"
                  : hasActiveFilters
                    ? "Seçili filtrelere uygun kayıt bulunamadı"
                    : "Kayıt bulunamadı"
              }
              action={
                canWrite && activeTab === "open" && orders.length === 0 ? (
                  <Link href="/work-orders/new">
                    <Button variant="accent">
                      <Plus className="h-4 w-4" /> Yeni talep kaydı oluştur
                    </Button>
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <DataTable>
              <DataTableHead>
                {canWrite && <DataTableHeader>İşlemler</DataTableHeader>}
                <DataTableHeader>Sigortalı</DataTableHeader>
                <DataTableHeader>İl</DataTableHeader>
                <DataTableHeader>İlçe</DataTableHeader>
                <DataTableHeader>{domainLabels.jobType.one}</DataTableHeader>
                <DataTableHeader>Randevu</DataTableHeader>
                <DataTableHeader>{domainLabels.workOrder.ticket}</DataTableHeader>
                <DataTableHeader>{domainLabels.workOrder.assistanceFileNo}</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.one}</DataTableHeader>
                <DataTableHeader>{domainLabels.planner.one}</DataTableHeader>
                <DataTableHeader>Durum</DataTableHeader>
                {canWrite && <DataTableHeader>Durum Değiştir</DataTableHeader>}
              </DataTableHead>
              <DataTableBody>
                {filteredOrders.map((o) => {
                  const missingPrice = shouldHighlightMissingInvoicePrice(o);
                  return (
                  <DataTableRow
                    key={o.id}
                    className={cn(
                      missingPrice && "bg-red-950/10 hover:bg-red-950/15 [&_td]:text-red-950 [&_.text-zinc-400]:text-red-900/70 [&_.text-zinc-500]:text-red-900/80"
                    )}
                  >
                    {canWrite && (
                      <DataTableCell>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/work-orders/${o.id}${activeTab === "completed" ? "?tab=completed" : ""}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                          >
                            <Eye className="h-3.5 w-3.5" /> Düzenle
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDelete(o)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Sil
                          </button>
                        </div>
                      </DataTableCell>
                    )}
                    <DataTableCell className="text-sm font-medium text-zinc-900">
                      {insuredFullName(o)}
                    </DataTableCell>
                    <DataTableCell className="text-sm text-zinc-600">{o.insuredCity || "—"}</DataTableCell>
                    <DataTableCell className="text-sm text-zinc-600">{o.insuredDistrict || "—"}</DataTableCell>
                    <DataTableCell className="text-sm text-zinc-700">
                      {jobTypeLabel(o.jobType, jobTypeOptions)}
                    </DataTableCell>
                    <DataTableCell className="text-xs text-zinc-600">
                      {canWrite ? (
                        <input
                          type="datetime-local"
                          value={toDatetimeLocalValue(o.appointmentAt)}
                          onChange={(e) => void updateAppointment(o.id, e.target.value)}
                          className="min-w-[160px] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      ) : o.appointmentAt ? (
                        formatDateTime(o.appointmentAt)
                      ) : (
                        "—"
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="font-medium text-zinc-900">{o.title}</div>
                    </DataTableCell>
                    <DataTableCell>
                      <span className="font-mono text-xs font-semibold text-zinc-800">
                        {o.asistansDosyaNo || "—"}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-start gap-2">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        <div className="font-medium text-zinc-900">
                          {o.insuranceCompany.shortCode ? `${o.insuranceCompany.shortCode} — ` : ""}
                          {o.insuranceCompany.name}
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      {canWrite ? (
                        <select
                          value={o.assignedTo?.id ?? ""}
                          onChange={(e) => void updateAssignee(o.id, e.target.value)}
                          className="min-w-[140px] max-w-[180px] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {responsibleSelectOptions(responsibles, o.assignedTo).map((opt) => (
                            <option key={opt.value || "none"} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : o.assignedTo ? (
                        <span className="text-xs font-medium text-indigo-700">{o.assignedTo.name}</span>
                      ) : (
                        <span className="text-xs text-zinc-400">Atanmadı</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <Badge className={workOrderStatusColors[o.status]}>
                        {workOrderStatusLabels[o.status]}
                      </Badge>
                    </DataTableCell>
                    {canWrite && (
                      <DataTableCell>
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="min-w-[160px] max-w-[200px] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {workOrderStatusFlow.map((status) => (
                            <option key={status} value={status}>
                              {workOrderStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </DataTableCell>
                    )}
                  </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
