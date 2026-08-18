import { Building2, MapPin, Phone, Mail, User } from "lucide-react";
import type { InsuranceCompanyContactData } from "@/lib/insurance-company";
import { companyLocationLine, resolveCompanyEmail } from "@/lib/insurance-company";
import { domainLabels } from "@/lib/domain";

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
      <div>
        <p className="text-[11px] font-medium text-zinc-400">{label}</p>
        <p className="text-sm text-zinc-800">{value}</p>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-zinc-400">{label}</p>
      <p className="mt-1 text-sm text-zinc-900">{value?.trim() || "—"}</p>
    </div>
  );
}

interface InsuranceCompanyContactSummaryProps {
  company: InsuranceCompanyContactData & { name?: string };
  variant?: "panels" | "fields";
  showCompanyName?: boolean;
}

export function InsuranceCompanyContactSummary({
  company,
  variant = "panels",
  showCompanyName = false,
}: InsuranceCompanyContactSummaryProps) {
  const location = companyLocationLine(company);

  if (variant === "fields") {
    return (
      <>
        <DetailField label={domainLabels.insuranceCompany.shortCode} value={company.shortCode} />
        {showCompanyName && (
          <DetailField label={domainLabels.insuranceCompany.one} value={company.name} />
        )}
        <DetailField label="Şehir" value={company.city} />
        <DetailField label="Adres" value={company.address} />
        <DetailField label={domainLabels.insuranceCompany.contact} value={company.contactPerson} />
        <DetailField label="Telefon" value={company.phone} />
        <DetailField label="E-posta" value={resolveCompanyEmail(company)} />
        <DetailField
          label={domainLabels.insuranceCompany.assistanceContact}
          value={company.assistanceContactName}
        />
        <DetailField label="Asistans telefon" value={company.assistancePhone} />
        <DetailField
          label={domainLabels.insuranceCompany.accountManager}
          value={company.accountManagerName}
        />
        <DetailField label="Hesap yöneticisi telefon" value={company.accountManagerPhone} />
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Building2 className="h-3.5 w-3.5" /> {domainLabels.insuranceCompany.one}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {showCompanyName && company.name ? (
            <InfoRow icon={Building2} label={domainLabels.insuranceCompany.one} value={company.name} />
          ) : null}
          {company.city ? <InfoRow icon={MapPin} label="Şehir" value={company.city} /> : null}
          <InfoRow icon={MapPin} label="Adres" value={company.address ?? location} />
        </div>
      </div>
      <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Phone className="h-3.5 w-3.5" /> {domainLabels.insuranceCompany.contact}
        </p>
        <InsuranceCompanyOperasyonSummary company={company} embedded />
      </div>
      <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <User className="h-3.5 w-3.5" /> Asistans & Hesap
        </p>
        <InsuranceCompanyAssistanceSummary company={company} embedded />
      </div>
    </>
  );
}

export function InsuranceCompanyLocationSummary({
  company,
}: {
  company: InsuranceCompanyContactData & { name?: string };
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <div>
          <p className="text-xs font-medium text-zinc-500">Adres</p>
          <p className="text-sm text-zinc-800">{companyLocationLine(company) || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function InsuranceCompanyOperasyonSummary({
  company,
  embedded,
}: {
  company: InsuranceCompanyContactData;
  embedded?: boolean;
}) {
  const content = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <InfoRow icon={User} label="Yetkili" value={company.contactPerson ?? ""} />
      <InfoRow icon={Phone} label="Telefon" value={company.phone ?? ""} />
      <InfoRow icon={Mail} label="E-posta" value={resolveCompanyEmail(company) ?? ""} />
    </div>
  );

  if (embedded) return content;

  return <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">{content}</div>;
}

export function InsuranceCompanyAssistanceSummary({
  company,
  embedded,
}: {
  company: InsuranceCompanyContactData;
  embedded?: boolean;
}) {
  const grid = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <InfoRow
        icon={User}
        label={domainLabels.insuranceCompany.assistanceContact}
        value={company.assistanceContactName ?? ""}
      />
      <InfoRow icon={Phone} label="Asistans telefon" value={company.assistancePhone ?? ""} />
      <InfoRow
        icon={User}
        label={domainLabels.insuranceCompany.accountManager}
        value={company.accountManagerName ?? ""}
      />
      <InfoRow icon={Phone} label="Hesap yöneticisi telefon" value={company.accountManagerPhone ?? ""} />
    </div>
  );

  if (embedded) return grid;

  return <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">{grid}</div>;
}
