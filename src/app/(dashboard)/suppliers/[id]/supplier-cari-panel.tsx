"use client";
import { apiFetch } from "@/lib/api-client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, Wrench, CreditCard, MapPin, Phone, Pencil, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input, Textarea } from "@/components/form-fields";
import { Badge } from "@/components/badge";
import {
  Card, CardBody, CardHeader,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell, EmptyState,
} from "@/components/ui/card";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { workOrderStatusLabels, workOrderStatusColors } from "@/lib/permissions";
import { domainLabels } from "@/lib/domain";

interface LedgerEntry {
  id: string;
  type: "HIZMET" | "ODEME";
  amount: number;
  description: string | null;
  createdAt: string;
  workOrder: {
    id: string;
    ticketNo: string;
    title: string;
    status: string;
    insuranceCompany?: { name: string; shortCode: string | null };
  } | null;
}

interface WorkOrderSummary {
  id: string;
  ticketNo: string;
  title: string;
  status: string;
  supplierCost: number;
  completedAt: string | null;
  insuranceCompany: { name: string; shortCode: string | null };
}

interface SupplierCari {
  id: string;
  firstName: string;
  lastName: string;
  iban: string;
  city: string | null;
  district: string | null;
  phone: string | null;
  notes: string | null;
  balance: number;
  ledgerEntries: LedgerEntry[];
  workOrders: WorkOrderSummary[];
}

export function SupplierCariPanel({
  supplier,
  canWrite,
}: {
  supplier: SupplierCari;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: supplier.firstName,
    lastName: supplier.lastName,
    iban: supplier.iban,
    city: supplier.city ?? "",
    district: supplier.district ?? "",
    phone: supplier.phone ?? "",
    notes: supplier.notes ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm({
      firstName: supplier.firstName,
      lastName: supplier.lastName,
      iban: supplier.iban,
      city: supplier.city ?? "",
      district: supplier.district ?? "",
      phone: supplier.phone ?? "",
      notes: supplier.notes ?? "",
    });
  }, [supplier]);

  const totalHizmet = supplier.ledgerEntries
    .filter((e) => e.type === "HIZMET")
    .reduce((s, e) => s + e.amount, 0);
  const totalOdeme = supplier.ledgerEntries
    .filter((e) => e.type === "ODEME")
    .reduce((s, e) => s + e.amount, 0);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/suppliers/${supplier.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), description }),
      });
      if (!res.ok) return;
      setAmount("");
      setDescription("");
      setPaymentOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function openEditProfile() {
    setProfileForm({
      firstName: supplier.firstName,
      lastName: supplier.lastName,
      iban: supplier.iban,
      city: supplier.city ?? "",
      district: supplier.district ?? "",
      phone: supplier.phone ?? "",
      notes: supplier.notes ?? "",
    });
    setProfileError(null);
    setEditOpen(true);
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await apiFetch(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(typeof data.error === "string" ? data.error : "Kaydedilemedi.");
        return;
      }
      setEditOpen(false);
      router.refresh();
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div>
      <Link
        href="/suppliers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" /> {domainLabels.supplier.many}a dön
      </Link>

      <PageHeader
        title={`${supplier.firstName} ${supplier.lastName}`}
        description="Cari hesap — hizmetler ve ödemeler"
        breadcrumb={["Ana Sayfa", domainLabels.supplier.many, "Cari"]}
        action={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={openEditProfile}>
                <Pencil className="h-4 w-4" /> Bilgileri Düzenle
              </Button>
              <Button variant="accent" onClick={() => setPaymentOpen(true)}>
                <CreditCard className="h-4 w-4" /> Ödeme Gir
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Güncel Bakiye</p>
            <p className={cn("mt-1 text-2xl font-semibold", supplier.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
              {formatCurrency(supplier.balance)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {supplier.balance > 0 ? "Ödenmesi gereken" : supplier.balance < 0 ? "Fazla ödeme" : "Hesap kapalı"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Toplam Hizmet</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatCurrency(totalHizmet)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Toplam Ödeme</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{formatCurrency(totalOdeme)}</p>
          </CardBody>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Ekip Bilgileri" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-zinc-400">IBAN</p>
              <p className="mt-1 font-mono text-sm text-zinc-800">{supplier.iban}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                <MapPin className="h-3.5 w-3.5" /> İl / İlçe
              </p>
              <p className="mt-1 text-sm text-zinc-800">
                {[supplier.city, supplier.district].filter(Boolean).join(" / ") || "—"}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                <Phone className="h-3.5 w-3.5" /> Telefon
              </p>
              <p className="mt-1 text-sm text-zinc-800">{supplier.phone ?? "—"}</p>
            </div>
          </div>
          {supplier.notes && (
            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-400">
                <FileText className="h-3.5 w-3.5" /> Not
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{supplier.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Verilen Hizmetler" />
        <CardBody flush>
          {supplier.workOrders.length === 0 ? (
            <EmptyState message="Henüz hizmet kaydı yok" />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>{domainLabels.workOrder.ticket}</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.one}</DataTableHeader>
                <DataTableHeader>İş</DataTableHeader>
                <DataTableHeader>Tutar</DataTableHeader>
                <DataTableHeader>Durum</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {supplier.workOrders.map((o) => (
                  <DataTableRow key={o.id}>
                    <DataTableCell>
                      <Link href={`/work-orders/${o.id}`} className="font-mono text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                        {o.title}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      {o.insuranceCompany.shortCode ? `${o.insuranceCompany.shortCode} — ` : ""}{o.insuranceCompany.name}
                    </DataTableCell>
                    <DataTableCell>{o.title}</DataTableCell>
                    <DataTableCell className="font-medium">{formatCurrency(o.supplierCost)}</DataTableCell>
                    <DataTableCell>
                      <Badge className={workOrderStatusColors[o.status]}>
                        {workOrderStatusLabels[o.status]}
                      </Badge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Cari Hareketler" />
        <CardBody flush>
          {supplier.ledgerEntries.length === 0 ? (
            <EmptyState message="Cari hareket yok" />
          ) : (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Tarih</DataTableHeader>
                <DataTableHeader>Tür</DataTableHeader>
                <DataTableHeader>Açıklama</DataTableHeader>
                <DataTableHeader>Tutar</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {supplier.ledgerEntries.map((e) => (
                  <DataTableRow key={e.id}>
                    <DataTableCell className="text-xs text-zinc-500">{formatDateTime(e.createdAt)}</DataTableCell>
                    <DataTableCell>
                      {e.type === "HIZMET" ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
                          <Wrench className="h-3 w-3" /> Hizmet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                          <Banknote className="h-3 w-3" /> Ödeme
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <div>{e.description ?? "—"}</div>
                      {e.workOrder && (
                        <div className="text-xs text-zinc-400">{e.workOrder.ticketNo} — {e.workOrder.title}</div>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <span className={cn("font-semibold", e.type === "ODEME" ? "text-emerald-600" : "text-amber-600")}>
                        {e.type === "ODEME" ? "−" : "+"}{formatCurrency(e.amount)}
                      </span>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title={`${domainLabels.supplier.one} Ödemesi`}>
        <form onSubmit={handlePayment} className="space-y-4">
          <p className="text-sm text-zinc-500">
            Güncel bakiye: <span className="font-semibold text-zinc-900">{formatCurrency(supplier.balance)}</span>
          </p>
          <Input
            label="Ödeme Tutarı (₺)"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Textarea
            label="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Banka havalesi, nakit ödeme..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentOpen(false)}>İptal</Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Ekip Bilgilerini Düzenle" size="lg">
        <form onSubmit={handleProfileSave} className="space-y-4">
          {profileError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {profileError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Ad"
              value={profileForm.firstName}
              onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
            <Input
              label="Soyad"
              value={profileForm.lastName}
              onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
              required
            />
          </div>
          <Input
            label="IBAN"
            value={profileForm.iban}
            onChange={(e) => setProfileForm((f) => ({ ...f, iban: e.target.value }))}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="İl"
              value={profileForm.city}
              onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
            />
            <Input
              label="İlçe"
              value={profileForm.district}
              onChange={(e) => setProfileForm((f) => ({ ...f, district: e.target.value }))}
            />
          </div>
          <Input
            label="Telefon"
            value={profileForm.phone}
            onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Textarea
            label="Not"
            value={profileForm.notes}
            onChange={(e) => setProfileForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>İptal</Button>
            <Button type="submit" variant="accent" disabled={profileSaving}>
              {profileSaving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
