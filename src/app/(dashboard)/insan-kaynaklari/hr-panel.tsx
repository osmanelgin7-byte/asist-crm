"use client";
import { apiFetch } from "@/lib/api-client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2, Upload, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input, Select, Textarea } from "@/components/form-fields";
import {
  Card, CardBody, CardHeader,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell, EmptyState,
} from "@/components/ui/card";
import { Badge } from "@/components/badge";
import { roleLabels, roleColors, type Role } from "@/lib/permissions";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { deductsFromAnnualLeaveBalance, leaveRequiresAttachment } from "@/lib/hr-calculations";

interface LeaveRecord {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  type: string;
  note: string | null;
  attachmentFileName: string | null;
  attachmentPath: string | null;
}

interface AnnualLeaveUsageEntry {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  note: string | null;
  attachmentFileName: string | null;
}

interface LeaveSummaryData {
  serviceYears: number;
  annualEntitlementDays: number;
  totalAccruedDays: number;
  usedDays: number;
  remainingDays: number;
  annualLeaveUsage: AnnualLeaveUsageEntry[];
}

interface Employee {
  id: string;
  userId: string;
  nationalId: string | null;
  birthDate: string | null;
  phone: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  department: string | null;
  jobTitle: string | null;
  hireDate: string;
  terminationDate: string | null;
  monthlyGrossWage: number | null;
  notes: string | null;
  user: { id: string; name: string; email: string; role: Role; active: boolean };
  leaveRecords: LeaveRecord[];
  leaveSummary: LeaveSummaryData;
}

interface UnlinkedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const leaveTypeLabels: Record<string, string> = {
  YILLIK: "Yıllık İzin",
  UCRETSIZ: "Ücretsiz İzin",
  RAPOR: "Rapor",
};

type EmployeePanelView = "ozluk" | "izin";

const employeePanelTabs: { id: EmployeePanelView; label: string }[] = [
  { id: "ozluk", label: "Özlük" },
  { id: "izin", label: "İzin" },
];

function toDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

function emptyProfileForm(userId = "") {
  return {
    userId,
    nationalId: "",
    birthDate: "",
    phone: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    department: "",
    jobTitle: "",
    hireDate: "",
    terminationDate: "",
    monthlyGrossWage: "",
    notes: "",
  };
}

export function HrPanel({ canWrite, canManageLeaves }: { canWrite: boolean; canManageLeaves: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [employeeView, setEmployeeView] = useState<Record<string, EmployeePanelView>>({});
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyProfileForm());
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [leaveForms, setLeaveForms] = useState<Record<string, { startDate: string; endDate: string; days: string; type: string; note: string; file: File | null }>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/hr/employees");
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(data.employees ?? []);
      setUnlinkedUsers(data.unlinkedUsers ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function openCreateProfile(userId = "") {
    setEditingEmployeeId(null);
    setProfileForm(emptyProfileForm(userId));
    setError("");
    setProfileModalOpen(true);
  }

  function openEditProfile(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setProfileForm({
      userId: employee.userId,
      nationalId: employee.nationalId ?? "",
      birthDate: toDateInput(employee.birthDate),
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      emergencyContact: employee.emergencyContact ?? "",
      emergencyPhone: employee.emergencyPhone ?? "",
      department: employee.department ?? "",
      jobTitle: employee.jobTitle ?? "",
      hireDate: toDateInput(employee.hireDate),
      terminationDate: toDateInput(employee.terminationDate),
      monthlyGrossWage: employee.monthlyGrossWage ? String(employee.monthlyGrossWage) : "",
      notes: employee.notes ?? "",
    });
    setError("");
    setProfileModalOpen(true);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      ...profileForm,
      monthlyGrossWage: profileForm.monthlyGrossWage ? Number(profileForm.monthlyGrossWage) : null,
      terminationDate: profileForm.terminationDate || null,
      birthDate: profileForm.birthDate || null,
    };

    const res = await apiFetch(
      editingEmployeeId ? `/api/hr/employees/${editingEmployeeId}` : "/api/hr/employees",
      {
        method: editingEmployeeId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Kayıt başarısız");
      return;
    }

    setProfileModalOpen(false);
    await loadData();
    if (data.id) openEmployeePanel(data.id, "ozluk");
  }

  function getLeaveForm(employeeId: string) {
    return leaveForms[employeeId] ?? { startDate: "", endDate: "", days: "", type: "YILLIK", note: "", file: null };
  }

  function updateLeaveForm(employeeId: string, field: string, value: string | File | null) {
    setLeaveForms((prev) => ({
      ...prev,
      [employeeId]: { ...getLeaveForm(employeeId), [field]: value },
    }));
  }

  async function submitLeave(employeeId: string) {
    const form = getLeaveForm(employeeId);
    if (leaveRequiresAttachment(form.type) && !form.file) {
      alert("Yıllık izin veya rapor için belge yükleyin.");
      return;
    }

    const body = new FormData();
    body.append("startDate", form.startDate);
    body.append("endDate", form.endDate);
    if (form.days) body.append("days", form.days);
    body.append("type", form.type);
    body.append("note", form.note);
    if (form.file) body.append("file", form.file);

    const res = await apiFetch(`/api/hr/employees/${employeeId}/leaves`, {
      method: "POST",
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : "İzin kaydedilemedi");
      return;
    }
    setLeaveForms((prev) => ({
      ...prev,
      [employeeId]: { startDate: "", endDate: "", days: "", type: "YILLIK", note: "", file: null },
    }));
    await loadData();
  }

  async function deleteLeave(leaveId: string) {
    if (!confirm("İzin kaydını silmek istediğinize emin misiniz?")) return;
    await apiFetch(`/api/hr/leaves/${leaveId}`, { method: "DELETE" });
    await loadData();
  }

  function getEmployeeView(employeeId: string): EmployeePanelView {
    return employeeView[employeeId] ?? "izin";
  }

  function openEmployeePanel(employeeId: string, view: EmployeePanelView) {
    setExpandedId(employeeId);
    setEmployeeView((prev) => ({ ...prev, [employeeId]: view }));
  }

  function toggleEmployeePanel(employeeId: string) {
    if (expandedId === employeeId) {
      setExpandedId(null);
      return;
    }
    openEmployeePanel(employeeId, getEmployeeView(employeeId));
  }

  const userOptions = useMemo(
    () => unlinkedUsers.map((user) => ({ value: user.id, label: `${user.name} (${user.email})` })),
    [unlinkedUsers]
  );

  return (
    <div>
      <PageHeader
        title="İnsan Kaynakları"
        description="Personel özlük bilgileri ve yıllık izin takibi"
        breadcrumb={["Ana Sayfa", "İnsan Kaynakları"]}
        action={
          canWrite ? (
            <Button variant="accent" onClick={() => openCreateProfile()} disabled={unlinkedUsers.length === 0}>
              <Plus className="h-4 w-4" /> Personel Ekle
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <Card><CardBody><p className="text-sm text-zinc-500">Yükleniyor...</p></CardBody></Card>
      ) : employees.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              message="Henüz personel kaydı yok"
              action={canWrite && unlinkedUsers.length > 0 ? <Button variant="accent" onClick={() => openCreateProfile()}>İlk Personeli Ekle</Button> : undefined}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {employees.map((employee) => {
            const expanded = expandedId === employee.id;
            const activeView = getEmployeeView(employee.id);
            const leaveForm = getLeaveForm(employee.id);
            const otherLeaveRecords = employee.leaveRecords.filter(
              (record) => !deductsFromAnnualLeaveBalance(record.type)
            );
            return (
              <Card key={employee.id}>
                <CardHeader
                  title={employee.user.name}
                  action={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge className={roleColors[employee.user.role]}>{roleLabels[employee.user.role]}</Badge>
                      <span className="text-xs text-zinc-500">Kalan izin: {employee.leaveSummary.remainingDays} gün</span>
                      <EmployeePanelTabs
                        activeView={expanded ? activeView : null}
                        onSelect={(view) => openEmployeePanel(employee.id, view)}
                      />
                      {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => openEditProfile(employee)}>Düzenle</Button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleEmployeePanel(employee.id)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
                        aria-label={expanded ? "Personel kartını kapat" : "Personel kartını aç"}
                      >
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  }
                />
                {expanded && (
                  <CardBody className="space-y-6">
                    {activeView === "ozluk" && (
                    <section className="grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100 md:grid-cols-3">
                      <Info label="E-posta" value={employee.user.email} />
                      <Info label="TC Kimlik" value={employee.nationalId} />
                      <Info label="Doğum Tarihi" value={employee.birthDate ? formatDate(employee.birthDate) : null} />
                      <Info label="Telefon" value={employee.phone} />
                      <Info label="Departman" value={employee.department} />
                      <Info label="Pozisyon" value={employee.jobTitle} />
                      <Info label="İşe Giriş" value={formatDate(employee.hireDate)} />
                      <Info label="İşten Çıkış" value={employee.terminationDate ? formatDate(employee.terminationDate) : "Devam ediyor"} />
                      <Info label="Brüt Maaş" value={employee.monthlyGrossWage ? formatCurrency(employee.monthlyGrossWage) : null} />
                      <Info label="Adres" value={employee.address} />
                      <Info label="Acil Durum" value={employee.emergencyContact} />
                      <Info label="Acil Tel" value={employee.emergencyPhone} />
                    </section>
                    )}

                    {activeView === "izin" && (
                    <section className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                      <h3 className="mb-4 text-sm font-semibold text-zinc-900">Yıllık İzin Yönetimi</h3>

                      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                        <LeaveStat label="Hizmet" value={`${employee.leaveSummary.serviceYears} yıl`} />
                        <LeaveStat label="Yıllık hak" value={`${employee.leaveSummary.annualEntitlementDays} gün`} hint="Güncel kademe" />
                        <LeaveStat label="Toplam hak" value={`${employee.leaveSummary.totalAccruedDays} gün`} hint="Biriken" />
                        <LeaveStat label="Kullanılan yıllık" value={`${employee.leaveSummary.usedDays} gün`} hint="Sadece yıllık izin" />
                        <LeaveStat
                          label="Kalan"
                          value={`${employee.leaveSummary.remainingDays} gün`}
                          highlight
                        />
                      </div>

                      <p className="mb-4 text-xs text-zinc-500">
                        Rapor ve ücretsiz izin kayıtları yıllık izin bakiyesinden düşülmez.
                      </p>

                      {canManageLeaves && (
                        <div className="mb-4 rounded-xl border border-purple-100 bg-white p-4">
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
                            <Upload className="h-4 w-4 text-purple-600" /> İzin / Rapor Ekle
                          </h4>
                          <div className="grid gap-3 md:grid-cols-5">
                            <Input label="Başlangıç" type="date" value={leaveForm.startDate} onChange={(e) => updateLeaveForm(employee.id, "startDate", e.target.value)} />
                            <Input label="Bitiş" type="date" value={leaveForm.endDate} onChange={(e) => updateLeaveForm(employee.id, "endDate", e.target.value)} />
                            <Input label="Gün (opsiyonel)" value={leaveForm.days} onChange={(e) => updateLeaveForm(employee.id, "days", e.target.value)} placeholder="Otomatik" />
                            <Select
                              label="Tür"
                              value={leaveForm.type}
                              onChange={(e) => updateLeaveForm(employee.id, "type", e.target.value)}
                              options={[
                                { value: "YILLIK", label: "Yıllık İzin" },
                                { value: "UCRETSIZ", label: "Ücretsiz İzin" },
                                { value: "RAPOR", label: "Rapor" },
                              ]}
                            />
                            <div className="flex items-end">
                              <Button type="button" variant="accent" className="w-full" onClick={() => submitLeave(employee.id)}>
                                Kaydet
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <Input className="mt-0" label="Not" value={leaveForm.note} onChange={(e) => updateLeaveForm(employee.id, "note", e.target.value)} />
                            <div className="space-y-1.5">
                              <label className="block text-sm font-medium text-zinc-700">
                                Belge Yükle{leaveRequiresAttachment(leaveForm.type) ? "" : " (opsiyonel)"}
                              </label>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
                                onChange={(e) => updateLeaveForm(employee.id, "file", e.target.files?.[0] ?? null)}
                                className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-purple-700"
                              />
                              {leaveForm.file && (
                                <p className="text-xs text-zinc-500">Seçilen: {leaveForm.file.name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <h4 className="mb-3 text-sm font-medium text-zinc-900">Yıllık İzin Kullanım Geçmişi</h4>
                        {employee.leaveSummary.annualLeaveUsage.length > 0 ? (
                          <DataTable>
                            <DataTableHead>
                              <DataTableHeader>Başlangıç</DataTableHeader>
                              <DataTableHeader>Bitiş</DataTableHeader>
                              <DataTableHeader>Kullanılan</DataTableHeader>
                              <DataTableHeader>Not</DataTableHeader>
                              <DataTableHeader>Belge</DataTableHeader>
                              {canManageLeaves && <DataTableHeader>Sil</DataTableHeader>}
                            </DataTableHead>
                            <DataTableBody>
                              {employee.leaveSummary.annualLeaveUsage.map((usage) => (
                                <DataTableRow key={usage.id}>
                                  <DataTableCell>{formatDate(usage.startDate)}</DataTableCell>
                                  <DataTableCell>{formatDate(usage.endDate)}</DataTableCell>
                                  <DataTableCell className="font-medium text-indigo-700">{usage.days} gün</DataTableCell>
                                  <DataTableCell className="text-zinc-500">{usage.note ?? "—"}</DataTableCell>
                                  <DataTableCell>
                                    {usage.attachmentFileName ? (
                                      <a
                                        href={`/api/hr/leaves/${usage.id}/attachment`}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        {usage.attachmentFileName}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-zinc-400">—</span>
                                    )}
                                  </DataTableCell>
                                  {canManageLeaves && (
                                    <DataTableCell>
                                      <button type="button" onClick={() => deleteLeave(usage.id)} className="text-red-500 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </DataTableCell>
                                  )}
                                </DataTableRow>
                              ))}
                            </DataTableBody>
                          </DataTable>
                        ) : (
                          <p className="text-sm text-zinc-400">Henüz yıllık izin kullanılmamış.</p>
                        )}
                      </div>

                      {otherLeaveRecords.length > 0 && (
                        <div>
                          <h4 className="mb-3 text-sm font-medium text-zinc-900">Rapor ve Ücretsiz İzin Kayıtları</h4>
                          <DataTable>
                            <DataTableHead>
                              <DataTableHeader>Tarih</DataTableHeader>
                              <DataTableHeader>Tür</DataTableHeader>
                              <DataTableHeader>Gün</DataTableHeader>
                              <DataTableHeader>Not</DataTableHeader>
                              <DataTableHeader>Belge</DataTableHeader>
                              {canManageLeaves && <DataTableHeader>Sil</DataTableHeader>}
                            </DataTableHead>
                            <DataTableBody>
                              {otherLeaveRecords.map((record) => (
                                <DataTableRow key={record.id}>
                                  <DataTableCell className="text-xs">{formatDate(record.startDate)} – {formatDate(record.endDate)}</DataTableCell>
                                  <DataTableCell>{leaveTypeLabels[record.type] ?? record.type}</DataTableCell>
                                  <DataTableCell>{record.days} gün</DataTableCell>
                                  <DataTableCell className="text-zinc-500">{record.note ?? "—"}</DataTableCell>
                                  <DataTableCell>
                                    {record.attachmentFileName ? (
                                      <a
                                        href={`/api/hr/leaves/${record.id}/attachment`}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        {record.attachmentFileName}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-zinc-400">—</span>
                                    )}
                                  </DataTableCell>
                                  {canManageLeaves && (
                                    <DataTableCell>
                                      <button type="button" onClick={() => deleteLeave(record.id)} className="text-red-500 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </DataTableCell>
                                  )}
                                </DataTableRow>
                              ))}
                            </DataTableBody>
                          </DataTable>
                        </div>
                      )}
                    </section>
                    )}
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title={editingEmployeeId ? "Personel Düzenle" : "Personel Ekle"}
        size="lg"
      >
        <form onSubmit={saveProfile} className="space-y-4">
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {!editingEmployeeId && (
            <Select
              label="Kullanıcı"
              value={profileForm.userId}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, userId: e.target.value }))}
              options={[{ value: "", label: "Seçin..." }, ...userOptions]}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="TC Kimlik No" value={profileForm.nationalId} onChange={(e) => setProfileForm((p) => ({ ...p, nationalId: e.target.value }))} />
            <Input label="Doğum Tarihi" type="date" value={profileForm.birthDate} onChange={(e) => setProfileForm((p) => ({ ...p, birthDate: e.target.value }))} />
            <Input label="Telefon" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
            <Input label="Departman" value={profileForm.department} onChange={(e) => setProfileForm((p) => ({ ...p, department: e.target.value }))} />
            <Input label="Pozisyon" value={profileForm.jobTitle} onChange={(e) => setProfileForm((p) => ({ ...p, jobTitle: e.target.value }))} />
            <Input label="Brüt Maaş (₺)" value={profileForm.monthlyGrossWage} onChange={(e) => setProfileForm((p) => ({ ...p, monthlyGrossWage: e.target.value }))} placeholder="Opsiyonel" />
            <Input label="İşe Giriş Tarihi" type="date" value={profileForm.hireDate} onChange={(e) => setProfileForm((p) => ({ ...p, hireDate: e.target.value }))} required />
            <Input label="İşten Çıkış Tarihi" type="date" value={profileForm.terminationDate} onChange={(e) => setProfileForm((p) => ({ ...p, terminationDate: e.target.value }))} />
            <Input label="Acil Durum Kişisi" value={profileForm.emergencyContact} onChange={(e) => setProfileForm((p) => ({ ...p, emergencyContact: e.target.value }))} />
            <Input label="Acil Durum Tel" value={profileForm.emergencyPhone} onChange={(e) => setProfileForm((p) => ({ ...p, emergencyPhone: e.target.value }))} />
          </div>

          <Textarea label="Adres" value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} rows={2} />
          <Textarea label="Notlar" value={profileForm.notes} onChange={(e) => setProfileForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setProfileModalOpen(false)}>İptal</Button>
            <Button type="submit" variant="accent">Kaydet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function EmployeePanelTabs({
  activeView,
  onSelect,
}: {
  activeView: EmployeePanelView | null;
  onSelect: (view: EmployeePanelView) => void;
}) {
  return (
    <div className="flex rounded-lg bg-zinc-100 p-0.5">
      {employeePanelTabs.map((tab) => {
        const active = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-white text-indigo-700 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function LeaveStat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-200", highlight && "ring-indigo-200 bg-indigo-50/50")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold", highlight ? "text-indigo-700" : "text-zinc-900")}>{value}</p>
      {hint && <p className="text-[10px] text-zinc-400">{hint}</p>}
    </div>
  );
}
