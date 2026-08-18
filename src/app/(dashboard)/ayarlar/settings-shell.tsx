import Link from "next/link";
import { Settings2, Wrench, Mail } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const sections = [
  {
    href: "/ayarlar/is-turleri",
    title: "İş Türleri",
    description: "Elektrik, sıhhi tesisat, klima gibi talep kategorilerini yönetin.",
    icon: Wrench,
  },
  {
    href: "/ayarlar/eposta",
    title: "E-posta",
    description: "IMAP/SMTP hesap bilgileri — gelen kutusu ve gönderim.",
    icon: Mail,
  },
] as const;

export function SettingsNav({ activeHref }: { activeHref?: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      <Link
        href="/ayarlar"
        className={cn(
          "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
          activeHref === "/ayarlar"
            ? "bg-zinc-900 text-white"
            : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:text-zinc-900"
        )}
      >
        Genel Bakış
      </Link>
      {sections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
            activeHref === section.href
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:text-zinc-900"
          )}
        >
          {section.title}
        </Link>
      ))}
    </nav>
  );
}

export function SettingsOverview() {
  return (
    <div>
      <PageHeader
        title="Ayarlar"
        description="Sistem tanımları ve yönetim seçenekleri"
        breadcrumb={["Yönetim", "Ayarlar"]}
      />

      <SettingsNav activeHref="/ayarlar" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group block">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardBody className="space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">{section.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">{section.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                    Yönet
                    <Settings2 className="h-3.5 w-3.5" />
                  </span>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
