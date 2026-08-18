"use client";
import { apiFetch } from "@/lib/api-client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { InsuranceCompanyFormSections } from "@/components/insurance-company-form-sections";
import {
  Card, CardBody,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell, EmptyState,
} from "@/components/ui/card";
import { domainLabels } from "@/lib/domain";
import { usePermissions } from "@/hooks/use-permissions";
import {
  emptyInsuranceCompanyFormValues,
  formValuesToInsuranceCompanyPayload,
  companyToFormValues,
  type InsuranceCompanyFormValues,
} from "@/lib/insurance-company";

interface InsuranceCompany {
  id: string;
  name: string;
  shortCode: string | null;
  city: string | null;
  address: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  assistanceContactName: string | null;
  assistancePhone: string | null;
  accountManagerName: string | null;
  accountManagerPhone: string | null;
  _count: { workOrders: number };
}

export function InsuranceCompaniesPage() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<InsuranceCompany | null>(null);
  const [form, setForm] = useState<InsuranceCompanyFormValues>(emptyInsuranceCompanyFormValues());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/api/insurance-companies");
    if (res.ok) setCompanies(await res.json());
  }

  useEffect(() => { load(); }, []);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    return companies.filter((c) =>
      [c.name, c.shortCode, c.city, c.address, c.contactPerson, c.phone, c.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(searchQuery))
    );
  }, [companies, searchQuery]);

  function patchForm(patch: Partial<InsuranceCompanyFormValues>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function openCreate() {
    setEditingCompany(null);
    setForm(emptyInsuranceCompanyFormValues());
    setModalOpen(true);
  }

  function openEdit(company: InsuranceCompany) {
    setEditingCompany(company);
    setForm(companyToFormValues(company));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCompany(null);
    setForm(emptyInsuranceCompanyFormValues());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = formValuesToInsuranceCompanyPayload(form);

    const res = await apiFetch(
      editingCompany ? `/api/insurance-companies/${editingCompany.id}` : "/api/insurance-companies",
      {
        method: editingCompany ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) return;

    closeModal();
    load();
  }

  async function handleDelete(company: InsuranceCompany) {
    const confirmed = window.confirm(
      `"${company.name}" ${domainLabels.insuranceCompany.one.toLowerCase()} kaydını silmek istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    setDeletingId(company.id);
    try {
      const res = await apiFetch(`/api/insurance-companies/${company.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(typeof data.error === "string" ? data.error : "Silinemedi.");
        return;
      }
      if (editingCompany?.id === company.id) closeModal();
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={domainLabels.insuranceCompany.many}
        description={`${domainLabels.insuranceCompany.many} kayıtları ve operasyon iletişim bilgileri`}
        breadcrumb={["Ana Sayfa", domainLabels.insuranceCompany.many]}
        action={
          can("insurance-companies:write") ? (
            <Button variant="accent" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yeni {domainLabels.insuranceCompany.one}
            </Button>
          ) : undefined
        }
      />

      {searchQuery && (
        <p className="mb-4 text-sm text-zinc-500">
          Arama: <span className="font-medium text-zinc-800">&quot;{searchParams.get("q")}&quot;</span>
          {" · "}
          {filteredCompanies.length} sonuç
        </p>
      )}

      <Card>
        <CardBody flush>
          {filteredCompanies.length === 0 ? (
            <EmptyState
              message={
                companies.length === 0
                  ? `Henüz ${domainLabels.insuranceCompany.one.toLowerCase()} eklenmemiş`
                  : `"${searchParams.get("q")}" için ${domainLabels.insuranceCompany.one.toLowerCase()} bulunamadı`
              }
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>{domainLabels.insuranceCompany.shortCode}</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.one}</DataTableHeader>
                <DataTableHeader>Şehir</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.contact}</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.assistanceContact}</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.accountManager}</DataTableHeader>
                <DataTableHeader>Dosya</DataTableHeader>
                {can("insurance-companies:write") && <DataTableHeader>İşlem</DataTableHeader>}
              </DataTableHead>
              <DataTableBody>
                {filteredCompanies.map((c) => (
                  <DataTableRow key={c.id}>
                    <DataTableCell>{c.shortCode ?? "—"}</DataTableCell>
                    <DataTableCell className="font-medium text-zinc-900">{c.name}</DataTableCell>
                    <DataTableCell>{c.city ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <div>{c.contactPerson ?? "—"}</div>
                      <div className="text-xs text-zinc-400">{c.phone ?? c.email ?? ""}</div>
                    </DataTableCell>
                    <DataTableCell>
                      <div>{c.assistanceContactName ?? "—"}</div>
                      <div className="text-xs text-zinc-400">{c.assistancePhone ?? ""}</div>
                    </DataTableCell>
                    <DataTableCell>
                      <div>{c.accountManagerName ?? "—"}</div>
                      <div className="text-xs text-zinc-400">{c.accountManagerPhone ?? ""}</div>
                    </DataTableCell>
                    <DataTableCell>{c._count.workOrders}</DataTableCell>
                    {can("insurance-companies:write") && (
                      <DataTableCell>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-indigo-600"
                            aria-label={`${domainLabels.insuranceCompany.one} düzenle`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(c)}
                            disabled={deletingId === c.id}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            aria-label={`${domainLabels.insuranceCompany.one} sil`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </DataTableCell>
                    )}
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
        title={
          editingCompany
            ? `${domainLabels.insuranceCompany.one} Düzenle — ${editingCompany.name}`
            : `Yeni ${domainLabels.insuranceCompany.one}`
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <InsuranceCompanyFormSections values={form} onChange={patchForm} compact />
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
            <Button type="button" variant="secondary" onClick={closeModal}>İptal</Button>
            <Button type="submit" variant="accent">{editingCompany ? "Kaydet" : "Ekle"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
