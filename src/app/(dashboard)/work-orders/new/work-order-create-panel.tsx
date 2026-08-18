"use client";

import { apiFetch } from "@/lib/api-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Input, Select, Textarea } from "@/components/form-fields";
import { Card, CardBody } from "@/components/ui/card";
import { domainLabels } from "@/lib/domain";
import type { InsuranceCompanyContactData } from "@/lib/insurance-company";
import { companyLocationLine } from "@/lib/insurance-company";
import { InsuranceCompanyPicker } from "@/components/insurance-company-picker";
import { OperatorNotesChat } from "@/components/operator-notes-chat";
import { ProvinceDistrictPicker } from "@/components/province-district-picker";
import type { ResponsibleOption } from "@/lib/responsibles";

interface InsuranceCompany extends InsuranceCompanyContactData {
  id: string;
  name: string;
}

interface WorkOrderCreatePanelProps {
  insuranceCompanies: InsuranceCompany[];
  responsibles: ResponsibleOption[];
  jobTypeOptions: { value: string; label: string }[];
}

export function WorkOrderCreatePanel({
  insuranceCompanies,
  responsibles,
  jobTypeOptions,
}: WorkOrderCreatePanelProps) {
  const router = useRouter();
  const defaultJobType = jobTypeOptions[0]?.value ?? "";

  const [submitting, setSubmitting] = useState(false);
  const [insuranceCompanyId, setInsuranceCompanyId] = useState("");
  const [jobType, setJobType] = useState(defaultJobType);
  const [title, setTitle] = useState("");
  const [asistansDosyaNo, setAsistansDosyaNo] = useState("");
  const [insuredFirstName, setInsuredFirstName] = useState("");
  const [insuredLastName, setInsuredLastName] = useState("");
  const [insuredPhone, setInsuredPhone] = useState("");
  const [insuredAddress, setInsuredAddress] = useState("");
  const [insuredCity, setInsuredCity] = useState("");
  const [insuredDistrict, setInsuredDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [operatorNote, setOperatorNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createResponsibleOptions = [
    { value: "", label: "Koordinatör seçin..." },
    ...responsibles.map((r) => ({ value: r.id, label: r.name })),
  ];
  const selectedCompany = insuranceCompanies.find((c) => c.id === insuranceCompanyId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Dosya No zorunludur.");
      return;
    }
    if (!asistansDosyaNo.trim()) {
      setFormError("Asistans Dosya No zorunludur.");
      return;
    }
    if (!assignedToId) {
      setFormError("Kayıt oluşturmak için koordinatör seçimi zorunludur.");
      return;
    }
    if (!jobType) {
      setFormError("Kayıt oluşturmak için en az bir iş türü tanımlanmalıdır.");
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insuranceCompanyId,
          jobType,
          title,
          asistansDosyaNo,
          insuredFirstName,
          insuredLastName,
          insuredPhone,
          insuredAddress,
          insuredCity,
          insuredDistrict,
          description,
          priority,
          assignedToId,
          appointmentAt: appointmentAt ? new Date(appointmentAt).toISOString() : null,
          operatorNote: operatorNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Kayıt oluşturulamadı.");
        return;
      }
      if (typeof data.id === "string") {
        router.push(`/work-orders/${data.id}`);
      } else {
        router.push("/work-orders");
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/work-orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" /> {domainLabels.workOrder.many} listesine dön
      </Link>

      <PageHeader
        title={`Yeni ${domainLabels.workOrder.one}`}
        description={`Sigortalı, hizmet ve randevu bilgilerini girerek yeni kayıt oluşturun`}
        breadcrumb={["Ana Sayfa", domainLabels.workOrder.many, "Yeni"]}
      />

      <Card>
        <CardBody>
          <form onSubmit={handleCreate} className="space-y-6">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {formError}
              </div>
            )}

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <Building2 className="h-3.5 w-3.5" /> Firma & Lokasyon
              </h3>
              <div className="space-y-2">
                <InsuranceCompanyPicker
                  companies={insuranceCompanies}
                  value={insuranceCompanyId}
                  onChange={setInsuranceCompanyId}
                  label={`${domainLabels.insuranceCompany.shortCode} / ${domainLabels.insuranceCompany.one} seçimi`}
                  showContactSummary={false}
                />
                {selectedCompany && (
                  <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 ring-1 ring-zinc-100">
                    {companyLocationLine(selectedCompany) || "Adres bilgisi yok"}
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={domainLabels.workOrder.ticket}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: 2026-004521"
                  required
                />
                <Input
                  label={domainLabels.workOrder.assistanceFileNo}
                  value={asistansDosyaNo}
                  onChange={(e) => setAsistansDosyaNo(e.target.value)}
                  placeholder={`${domainLabels.insuranceCompany.one} asistans dosya numarası`}
                  required
                />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 ring-1 ring-zinc-100">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <User className="h-3.5 w-3.5" /> Sigortalı Bilgileri
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Ad"
                  value={insuredFirstName}
                  onChange={(e) => setInsuredFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Soyad"
                  value={insuredLastName}
                  onChange={(e) => setInsuredLastName(e.target.value)}
                  required
                />
                <Input
                  label="Telefon"
                  value={insuredPhone}
                  onChange={(e) => setInsuredPhone(e.target.value)}
                  placeholder="05xx xxx xx xx"
                  required
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Adres"
                    value={insuredAddress}
                    onChange={(e) => setInsuredAddress(e.target.value)}
                  />
                </div>
                <ProvinceDistrictPicker
                  province={insuredCity}
                  district={insuredDistrict}
                  onProvinceChange={setInsuredCity}
                  onDistrictChange={setInsuredDistrict}
                />
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <Wrench className="h-3.5 w-3.5" /> İş Detayı
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="İş Seçimi"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    required
                    options={jobTypeOptions}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Detaylı Açıklama"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Olay yeri, araç bilgisi, poliçe notları..."
                  />
                </div>
                <Select
                  label="Öncelik"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  options={[
                    { value: "DUSUK", label: "Düşük" },
                    { value: "NORMAL", label: "Normal" },
                    { value: "YUKSEK", label: "Yüksek" },
                    { value: "ACIL", label: "Acil" },
                  ]}
                />
                <Select
                  label={domainLabels.planner.one}
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  options={createResponsibleOptions}
                  required
                />
                <Input
                  label="Randevu tarihi"
                  type="datetime-local"
                  value={appointmentAt}
                  onChange={(e) => setAppointmentAt(e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Randevu tarihi koordinatörün takvimine otomatik eklenir.
              </p>
            </section>

            <section>
              <OperatorNotesChat
                compact
                draft={operatorNote}
                onDraftChange={setOperatorNote}
                canWrite
              />
            </section>

            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
              <Link href="/work-orders">
                <Button type="button" variant="secondary">İptal</Button>
              </Link>
              <Button
                type="submit"
                variant="accent"
                disabled={
                  !insuranceCompanyId ||
                  !assignedToId ||
                  !title.trim() ||
                  !asistansDosyaNo.trim() ||
                  !jobType ||
                  submitting
                }
              >
                {submitting ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
