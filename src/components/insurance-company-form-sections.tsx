import { Input, Textarea } from "@/components/form-fields";
import type { InsuranceCompanyFormValues } from "@/lib/insurance-company";
import { domainLabels } from "@/lib/domain";

interface InsuranceCompanyFormSectionsProps {
  values: InsuranceCompanyFormValues;
  onChange: (patch: Partial<InsuranceCompanyFormValues>) => void;
  nameRequired?: boolean;
  compact?: boolean;
}

export function InsuranceCompanyFormSections({
  values,
  onChange,
  nameRequired = true,
  compact = false,
}: InsuranceCompanyFormSectionsProps) {
  const sectionTitle = compact
    ? "mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"
    : "mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400";
  const fieldGap = compact ? "gap-3" : "gap-4";

  return (
    <>
      <section>
        <h3 className={sectionTitle}>{domainLabels.insuranceCompany.one}</h3>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${fieldGap}`}>
          <Input
            label={domainLabels.insuranceCompany.shortCode}
            value={values.shortCode}
            onChange={(e) => onChange({ shortCode: e.target.value })}
            placeholder="Allianz, Anadolu Sigorta..."
          />
          <Input
            label={`${domainLabels.insuranceCompany.one} adı`}
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required={nameRequired}
            placeholder={`${domainLabels.insuranceCompany.one} adı`}
          />
          <Input label="Şehir" value={values.city} onChange={(e) => onChange({ city: e.target.value })} />
          <div className="sm:col-span-2">
            <Textarea
              label="Adres"
              value={values.address}
              onChange={(e) => onChange({ address: e.target.value })}
              rows={compact ? 2 : 2}
            />
          </div>
        </div>
      </section>
      <section>
        <h3 className={sectionTitle}>{domainLabels.insuranceCompany.contact}</h3>
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${fieldGap}`}>
          <Input
            label="Yetkili"
            value={values.contactPerson}
            onChange={(e) => onChange({ contactPerson: e.target.value })}
          />
          <Input label="Telefon" value={values.phone} onChange={(e) => onChange({ phone: e.target.value })} />
          <Input
            label="E-posta"
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
      </section>
      <section>
        <h3 className={sectionTitle}>{domainLabels.insuranceCompany.assistanceContact}</h3>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${fieldGap}`}>
          <Input
            label="Yetkili"
            value={values.assistanceContactName}
            onChange={(e) => onChange({ assistanceContactName: e.target.value })}
          />
          <Input
            label="Telefon"
            value={values.assistancePhone}
            onChange={(e) => onChange({ assistancePhone: e.target.value })}
          />
          <Input
            label={domainLabels.insuranceCompany.accountManager}
            value={values.accountManagerName}
            onChange={(e) => onChange({ accountManagerName: e.target.value })}
          />
          <Input
            label="Hesap yöneticisi telefon"
            value={values.accountManagerPhone}
            onChange={(e) => onChange({ accountManagerPhone: e.target.value })}
          />
        </div>
      </section>
    </>
  );
}
