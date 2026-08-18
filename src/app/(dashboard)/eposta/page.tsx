import { Suspense } from "react";
import { MailPanel } from "./mail-panel";

export default function EpostaPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Yükleniyor…</div>}>
      <MailPanel />
    </Suspense>
  );
}
