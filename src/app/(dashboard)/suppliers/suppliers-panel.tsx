"use client";
import { apiFetch } from "@/lib/api-client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Truck, Wallet, Pencil, Search, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input, Textarea } from "@/components/form-fields";
import {
  Card, CardBody,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell, EmptyState,
} from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { domainLabels } from "@/lib/domain";
import {
  buildSupplierSearchQuery,
  hasSupplierSearchFilters,
  type SupplierSearchFilters,
} from "@/lib/supplier-search";

interface Supplier {
  id: string;
  firstName: string;
  lastName: string;
  iban: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  notes: string | null;
  balance: number;
  _count: { workOrders: number; ledgerEntries: number };
}

interface SupplierFormState {
  firstName: string;
  lastName: string;
  iban: string;
  city: string;
  district: string;
  phone: string;
  notes: string;
}

const emptyForm = (): SupplierFormState => ({
  firstName: "",
  lastName: "",
  iban: "",
  city: "",
  district: "",
  phone: "",
  notes: "",
});

function supplierToForm(supplier: Supplier): SupplierFormState {
  return {
    firstName: supplier.firstName,
    lastName: supplier.lastName,
    iban: supplier.iban,
    city: supplier.city ?? "",
    district: supplier.district ?? "",
    phone: supplier.phone ?? "",
    notes: supplier.notes ?? "",
  };
}

function filtersToFormState(filters: SupplierSearchFilters) {
  return {
    firstName: filters.firstName ?? "",
    lastName: filters.lastName ?? "",
    phone: filters.phone ?? "",
    city: filters.city ?? "",
    district: filters.district ?? "",
    service: filters.service ?? "",
  };
}

export function SuppliersPanel({
  suppliers,
  canWrite,
  initialFilters,
}: {
  suppliers: Supplier[];
  canWrite: boolean;
  initialFilters: SupplierSearchFilters;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchForm, setSearchForm] = useState(() => filtersToFormState(initialFilters));
  const searchActive = hasSupplierSearchFilters(initialFilters);

  useEffect(() => {
    setSearchForm(filtersToFormState(initialFilters));
  }, [initialFilters]);

  function patchForm(patch: Partial<SupplierFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function openCreate() {
    setEditingSupplier(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm(supplierToForm(supplier));
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSupplier(null);
    setForm(emptyForm());
    setFormError(null);
  }

  function patchSearchForm(patch: Partial<ReturnType<typeof filtersToFormState>>) {
    setSearchForm((current) => ({ ...current, ...patch }));
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = buildSupplierSearchQuery({
      firstName: searchForm.firstName.trim() || undefined,
      lastName: searchForm.lastName.trim() || undefined,
      phone: searchForm.phone.trim() || undefined,
      city: searchForm.city.trim() || undefined,
      district: searchForm.district.trim() || undefined,
      service: searchForm.service.trim() || undefined,
    });
    const qs = query.toString();
    router.push(qs ? `/suppliers?${qs}` : "/suppliers");
  }

  function clearSearch() {
    setSearchForm(filtersToFormState({}));
    router.push("/suppliers");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch(
        editingSupplier ? `/api/suppliers/${editingSupplier.id}` : "/api/suppliers",
        {
          method: editingSupplier ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Kaydedilemedi.");
        return;
      }
      closeModal();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={domainLabels.supplier.many}
        description={`${domainLabels.supplier.one} bilgileri ve cari hesap takibi`}
        breadcrumb={["Ana Sayfa", domainLabels.supplier.many]}
        action={
          canWrite ? (
            <Button variant="accent" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yeni {domainLabels.supplier.one}
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <CardBody>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Ad"
                value={searchForm.firstName}
                onChange={(e) => patchSearchForm({ firstName: e.target.value })}
                placeholder="Ahmet"
              />
              <Input
                label="Soyad"
                value={searchForm.lastName}
                onChange={(e) => patchSearchForm({ lastName: e.target.value })}
                placeholder="Yılmaz"
              />
              <Input
                label="Telefon"
                value={searchForm.phone}
                onChange={(e) => patchSearchForm({ phone: e.target.value })}
                placeholder="0532 000 00 00"
              />
              <Input
                label="İl"
                value={searchForm.city}
                onChange={(e) => patchSearchForm({ city: e.target.value })}
                placeholder="İstanbul"
              />
              <Input
                label="İlçe"
                value={searchForm.district}
                onChange={(e) => patchSearchForm({ district: e.target.value })}
                placeholder="Kadıköy"
              />
              <Input
                label="Hizmet"
                value={searchForm.service}
                onChange={(e) => patchSearchForm({ service: e.target.value })}
                placeholder="Çekici, konaklama, cam hasarı…"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="accent">
                <Search className="h-4 w-4" /> Ara
              </Button>
              {searchActive && (
                <Button type="button" variant="secondary" onClick={clearSearch}>
                  <X className="h-4 w-4" /> Temizle
                </Button>
              )}
              {searchActive && (
                <p className="text-sm text-zinc-500">
                  {suppliers.length} sonuç
                </p>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody flush>
          {suppliers.length === 0 ? (
            <EmptyState
              message={
                searchActive
                  ? "Arama kriterlerinize uygun hizmet sağlayıcı bulunamadı"
                  : `Henüz ${domainLabels.supplier.one.toLowerCase()} eklenmemiş`
              }
              action={
                canWrite ? (
                  <Button variant="accent" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> {domainLabels.supplier.one} ekle
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Ad Soyad</DataTableHeader>
                <DataTableHeader>İl / İlçe</DataTableHeader>
                <DataTableHeader>Telefon</DataTableHeader>
                <DataTableHeader>IBAN</DataTableHeader>
                <DataTableHeader>Cari Bakiye</DataTableHeader>
                <DataTableHeader>Talep Kaydı</DataTableHeader>
                <DataTableHeader>İşlem</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {suppliers.map((s) => (
                  <DataTableRow key={s.id}>
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                          <Truck className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-zinc-900">{s.firstName} {s.lastName}</span>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-sm text-zinc-600">
                      {[s.city, s.district].filter(Boolean).join(" / ") || "—"}
                    </DataTableCell>
                    <DataTableCell className="text-sm text-zinc-600">{s.phone ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <span className="font-mono text-xs text-zinc-600">{s.iban}</span>
                    </DataTableCell>
                    <DataTableCell>
                      <span className={cn("font-semibold", s.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                        {formatCurrency(s.balance)}
                      </span>
                    </DataTableCell>
                    <DataTableCell>{s._count.workOrders}</DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 hover:text-indigo-700"
                          >
                            <Pencil className="h-4 w-4" /> Düzenle
                          </button>
                        )}
                        <Link
                          href={`/suppliers/${s.id}`}
                          className={cn(
                            "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
                            "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                          )}
                        >
                          <Wallet className="h-4 w-4" /> Cari
                        </Link>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingSupplier ? `${editingSupplier.firstName} ${editingSupplier.lastName} — Düzenle` : `Yeni ${domainLabels.supplier.one}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <Input
            label="Ad"
            value={form.firstName}
            onChange={(e) => patchForm({ firstName: e.target.value })}
            placeholder="Ahmet"
            required
          />
          <Input
            label="Soyad"
            value={form.lastName}
            onChange={(e) => patchForm({ lastName: e.target.value })}
            placeholder="Yılmaz"
            required
          />
          <Input
            label="IBAN"
            value={form.iban}
            onChange={(e) => patchForm({ iban: e.target.value })}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="İl"
              value={form.city}
              onChange={(e) => patchForm({ city: e.target.value })}
              placeholder="İstanbul"
            />
            <Input
              label="İlçe"
              value={form.district}
              onChange={(e) => patchForm({ district: e.target.value })}
              placeholder="Kadıköy"
            />
          </div>
          <Input
            label="Telefon"
            value={form.phone}
            onChange={(e) => patchForm({ phone: e.target.value })}
            placeholder="0532 000 00 00"
          />
          <Textarea
            label="Not"
            value={form.notes}
            onChange={(e) => patchForm({ notes: e.target.value })}
            rows={3}
            placeholder="Ekip hakkında notlar…"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>İptal</Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "Kaydediliyor..." : editingSupplier ? "Kaydet" : "Ekle"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
