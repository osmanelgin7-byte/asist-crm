"use client";
import { apiFetch } from "@/lib/api-client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input } from "@/components/form-fields";
import { Badge } from "@/components/badge";
import {
  Card,
  CardBody,
  DataTable,
  DataTableHead,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  EmptyState,
} from "@/components/ui/card";
import { slugifyJobTypeCode } from "@/lib/job-types";
import { SettingsNav } from "../settings-shell";

export interface JobTypeRow {
  code: string;
  label: string;
  sortOrder: number;
  active: boolean;
  usageCount: number;
}

export function JobTypesPanel({
  jobTypes,
  canManage,
}: {
  jobTypes: JobTypeRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobTypeRow | null>(null);
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setLabel("");
    setSortOrder(String((jobTypes.at(-1)?.sortOrder ?? -1) + 1));
    setActive(true);
    setError(null);
    setCreateOpen(true);
  }

  function openEdit(item: JobTypeRow) {
    setEditTarget(item);
    setLabel(item.label);
    setSortOrder(String(item.sortOrder));
    setActive(item.active);
    setError(null);
  }

  function closeEdit() {
    setEditTarget(null);
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch("/api/job-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, sortOrder: Number(sortOrder) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Kayıt oluşturulamadı.");
        return;
      }
      setCreateOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/job-types/${encodeURIComponent(editTarget.code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, sortOrder: Number(sortOrder), active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Güncellenemedi.");
        return;
      }
      closeEdit();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: JobTypeRow) {
    const usageNote =
      item.usageCount > 0
        ? `\n\n${item.usageCount} kayıt bu türü kullanıyor; silindikten sonra kayıtlarda kod olarak görünmeye devam eder.`
        : "";
    if (!window.confirm(`"${item.label}" iş türünü silmek istediğinize emin misiniz?${usageNote}`)) return;
    const res = await apiFetch(`/api/job-types/${encodeURIComponent(item.code)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(typeof data.error === "string" ? data.error : "Silinemedi.");
      return;
    }
    router.refresh();
  }

  const previewCode = label.trim() ? slugifyJobTypeCode(label) : "—";

  return (
    <div>
      <PageHeader
        title="İş Türleri"
        description="Talep kayıtlarında seçilecek arıza ve bakım kategorilerini yönetin"
        breadcrumb={["Yönetim", "Ayarlar", "İş Türleri"]}
        action={
          canManage ? (
            <Button variant="accent" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yeni İş Türü
            </Button>
          ) : undefined
        }
      />

      <SettingsNav activeHref="/ayarlar/is-turleri" />

      <Card>
        <CardBody flush>
          {jobTypes.length === 0 ? (
            <EmptyState
              message="Henüz iş türü tanımlanmamış"
              action={
                canManage ? (
                  <Button variant="accent" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> İş türü ekle
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Sıra</DataTableHeader>
                <DataTableHeader>Ad</DataTableHeader>
                <DataTableHeader>Kod</DataTableHeader>
                <DataTableHeader>Durum</DataTableHeader>
                <DataTableHeader>Kullanım</DataTableHeader>
                {canManage && <DataTableHeader>İşlem</DataTableHeader>}
              </DataTableHead>
              <DataTableBody>
                {jobTypes.map((item) => (
                  <DataTableRow key={item.code}>
                    <DataTableCell className="font-mono text-xs text-zinc-500">{item.sortOrder}</DataTableCell>
                    <DataTableCell className="font-medium text-zinc-900">{item.label}</DataTableCell>
                    <DataTableCell className="font-mono text-xs text-zinc-500">{item.code}</DataTableCell>
                    <DataTableCell>
                      <Badge className={item.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60" : "bg-zinc-100 text-zinc-600 ring-zinc-200/60"}>
                        {item.active ? "Aktif" : "Pasif"}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right text-sm text-zinc-600">{item.usageCount}</DataTableCell>
                    {canManage && (
                      <DataTableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDelete(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <p className="mt-4 flex items-start gap-2 text-sm text-zinc-500">
        <Settings2 className="mt-0.5 h-4 w-4 shrink-0" />
        Pasif iş türleri yeni kayıtlarda listelenmez. Kullanımda olan bir tür silinirse mevcut kayıtlarda kod olarak kalır.
      </p>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yeni İş Türü">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <Input
            label="İş türü adı"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Örn: Asansör Bakımı"
            required
          />
          <Input
            label="Liste sırası"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
          />
          <p className="text-xs text-zinc-500">
            Sistem kodu: <span className="font-mono">{previewCode}</span>
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button type="submit" variant="accent" disabled={submitting || !label.trim()}>
              {submitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editTarget != null} onClose={closeEdit} title="İş Türünü Düzenle">
        <form onSubmit={(e) => void handleUpdate(e)} className="space-y-4">
          <Input label="Kod" value={editTarget?.code ?? ""} disabled />
          <Input
            label="İş türü adı"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <Input
            label="Liste sırası"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Aktif (yeni kayıtlarda seçilebilir)
          </label>
          {editTarget && editTarget.usageCount > 0 && (
            <p className="text-xs text-zinc-500">
              {editTarget.usageCount} talep kaydında kullanılıyor.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="secondary" onClick={closeEdit}>İptal</Button>
            <Button type="submit" variant="accent" disabled={submitting || !label.trim()}>
              {submitting ? "Kaydediliyor..." : "Güncelle"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
