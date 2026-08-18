import { useMemo, useState } from "react";
import { domainLabels } from "@/lib/domain";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsuranceCompanyContactData } from "@/lib/insurance-company";
import { InsuranceCompanyContactSummary } from "@/components/insurance-company-contact-summary";

export type InsuranceCompanyOption = InsuranceCompanyContactData & {
  id: string;
  name: string;
};

interface InsuranceCompanyPickerProps {
  companies: InsuranceCompanyOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  showContactSummary?: boolean;
}

function companySearchText(company: InsuranceCompanyOption): string {
  return [
    company.name,
    company.shortCode,
    company.city,
    company.address,
    company.contactPerson,
    company.phone,
    company.email,
    company.assistanceContactName,
    company.assistancePhone,
    company.accountManagerName,
    company.accountManagerPhone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function InsuranceCompanyPicker({
  companies,
  value,
  onChange,
  label = `${domainLabels.insuranceCompany.shortCode} / ${domainLabels.insuranceCompany.one}`,
  showContactSummary = true,
}: InsuranceCompanyPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = companies.find((c) => c.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => companySearchText(c).includes(q));
  }, [companies, query]);

  function select(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700">{label}</label>

        {selected && !open ? (
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {selected.shortCode ? `${selected.shortCode} — ` : ""}
                {selected.name}
              </p>
              <p className="text-xs text-zinc-400">
                {selected.city}
                {selected.address ? ` · ${selected.address}` : ""}
              </p>
            </div>
            <button type="button" onClick={clear} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Kısa kod, şirket, şehir veya adres ara..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
            {open && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-zinc-400">
                    {domainLabels.insuranceCompany.one} bulunamadı
                  </p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => select(c.id)}
                      className={cn(
                        "flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-50",
                        value === c.id && "bg-indigo-50"
                      )}
                    >
                      <span className="text-sm font-medium text-zinc-900">
                        {c.shortCode ? `${c.shortCode} — ` : ""}
                        {c.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {c.city}
                        {c.address ? ` · ${c.address}` : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && showContactSummary ? (
        <InsuranceCompanyContactSummary company={selected} />
      ) : null}
    </div>
  );
}
