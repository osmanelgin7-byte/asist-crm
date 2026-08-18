export type InsuranceCompanyContactData = {
  name?: string;
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
};

export function resolveCompanyEmail(company: InsuranceCompanyContactData): string | null {
  return company.email ?? null;
}

export type InsuranceCompanyFormValues = {
  name: string;
  shortCode: string;
  city: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  assistanceContactName: string;
  assistancePhone: string;
  accountManagerName: string;
  accountManagerPhone: string;
};

function str(value: string | null | undefined): string {
  return value ?? "";
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export function emptyInsuranceCompanyFormValues(): InsuranceCompanyFormValues {
  return {
    name: "",
    shortCode: "",
    city: "",
    address: "",
    contactPerson: "",
    phone: "",
    email: "",
    assistanceContactName: "",
    assistancePhone: "",
    accountManagerName: "",
    accountManagerPhone: "",
  };
}

export function companyToFormValues(
  company: InsuranceCompanyContactData & { name: string }
): InsuranceCompanyFormValues {
  return {
    name: str(company.name),
    shortCode: str(company.shortCode),
    city: str(company.city),
    address: str(company.address),
    contactPerson: str(company.contactPerson),
    phone: str(company.phone),
    email: str(company.email),
    assistanceContactName: str(company.assistanceContactName),
    assistancePhone: str(company.assistancePhone),
    accountManagerName: str(company.accountManagerName),
    accountManagerPhone: str(company.accountManagerPhone),
  };
}

export function formValuesToInsuranceCompanyPayload(values: InsuranceCompanyFormValues) {
  return {
    name: values.name.trim(),
    shortCode: optional(values.shortCode),
    city: optional(values.city),
    address: optional(values.address),
    contactPerson: optional(values.contactPerson),
    phone: optional(values.phone),
    email: optional(values.email),
    assistanceContactName: optional(values.assistanceContactName),
    assistancePhone: optional(values.assistancePhone),
    accountManagerName: optional(values.accountManagerName),
    accountManagerPhone: optional(values.accountManagerPhone),
  };
}

export function companyLocationLine(
  company: Pick<InsuranceCompanyContactData, "address" | "city">
): string {
  return [company.address, company.city].filter(Boolean).join(", ");
}

/** Prisma kaydından UI tipine */
export function mapInsuranceCompanyRecord(company: {
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
}) {
  return company;
}
