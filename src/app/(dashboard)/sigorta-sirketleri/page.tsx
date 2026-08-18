import { Suspense } from "react";
import { InsuranceCompaniesPage } from "./insurance-companies-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Yükleniyor…</div>}>
      <InsuranceCompaniesPage />
    </Suspense>
  );
}
