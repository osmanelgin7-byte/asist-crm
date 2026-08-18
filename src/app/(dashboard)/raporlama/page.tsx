import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessTab } from "@/lib/app-tabs";
import type { AppTabId } from "@/lib/app-tabs";
import type { Role } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card, CardBody, CardHeader,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell,
} from "@/components/ui/card";
import { Badge } from "@/components/badge";
import { WorkOrderVolumeReportCard } from "@/components/work-order-volume-report";
import { prisma } from "@/lib/prisma";
import { formatDateTime, durationBetween } from "@/lib/utils";
import { workOrderStatusLabels, workOrderStatusColors, roleLabels } from "@/lib/permissions";
import { openWorkOrderFilter } from "@/lib/work-order-status";
import { getWorkOrderVolumeSummary, REPORT_TIMEZONE } from "@/lib/work-order-reporting";
import { domainLabels } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ReportingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as Role;
  const allowedTabs = (session.user.allowedTabs as AppTabId[] | null) ?? null;
  if (!canAccessTab(role, allowedTabs, "reporting")) redirect("/");

  const isFirstLogin = session.user.isFirstLogin;

  const [loginSessions, openOrders, completedOrders, volumeSummary] = await Promise.all([
    prisma.loginSession.findMany({
      where: { userId: { not: session.user.id } },
      include: {
        user: { select: { name: true, username: true, role: true } },
      },
      orderBy: { loginAt: "desc" },
      take: 50,
    }),
    prisma.workOrder.findMany({
      where: openWorkOrderFilter,
      include: { insuranceCompany: { select: { name: true } } },
      orderBy: { reportedAt: "desc" },
      take: 15,
    }),
    prisma.workOrder.findMany({
      where: {
        status: { in: ["TAMAMLANDI", "SERVIS_BEDELI_ILE_TAMAMLANDI"] },
        completedAt: { not: null },
      },
      include: { insuranceCompany: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
      take: 15,
    }),
    getWorkOrderVolumeSummary(prisma),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Raporlama"
        description="Dosya hacmi, personel giriş saatleri ve iş süreleri"
        breadcrumb={["Ana Sayfa", "Raporlama"]}
      />

      {isFirstLogin && (
        <div className="mb-6 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-4 text-sm text-indigo-900 ring-1 ring-indigo-100/80">
          İlk girişiniz tamamlandı. Bu sekmeden personelin sisteme giriş saatlerini ve iş kayıtlarının geçen sürelerini takip edebilirsiniz.
        </div>
      )}

      <div className="mb-6">
        <WorkOrderVolumeReportCard
          title="Dosya Hacmi Özeti"
          description={`Açılan dosyalar kayıt tarihine, kapatılan dosyalar tamamlanma tarihine göre hesaplanır (${REPORT_TIMEZONE}).`}
          rows={volumeSummary}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personel Giriş Saatleri" />
          <CardBody flush>
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Personel</DataTableHeader>
                <DataTableHeader>Rol</DataTableHeader>
                <DataTableHeader>Giriş saati</DataTableHeader>
                <DataTableHeader>Oturum süresi</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {loginSessions.map((entry) => (
                  <DataTableRow key={entry.id}>
                    <DataTableCell>
                      <span className="font-medium text-zinc-900">{entry.user.name}</span>
                      <p className="text-xs text-zinc-500">{entry.user.username}</p>
                    </DataTableCell>
                    <DataTableCell className="text-sm text-zinc-600">
                      {roleLabels[entry.user.role]}
                    </DataTableCell>
                    <DataTableCell className="text-sm">{formatDateTime(entry.loginAt)}</DataTableCell>
                    <DataTableCell className="font-medium text-indigo-600">
                      {durationBetween(entry.loginAt, entry.logoutAt ?? new Date())}
                    </DataTableCell>
                  </DataTableRow>
                ))}
                {loginSessions.length === 0 && (
                  <DataTableRow>
                    <DataTableCell className="text-center text-sm text-zinc-500">
                      Henüz personel giriş kaydı yok.
                    </DataTableCell>
                    <DataTableCell>—</DataTableCell>
                    <DataTableCell>—</DataTableCell>
                    <DataTableCell>—</DataTableCell>
                  </DataTableRow>
                )}
              </DataTableBody>
            </DataTable>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Açık ${domainLabels.workOrder.many} — Geçen Süre`} />
          <CardBody flush>
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Dosya No</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.one}</DataTableHeader>
                <DataTableHeader>Süre</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {openOrders.map((order) => (
                  <DataTableRow key={order.id}>
                    <DataTableCell>
                      <span className="font-mono text-xs">{order.title}</span>
                      <p className="mt-0.5 text-xs text-zinc-500">{order.ticketNo}</p>
                    </DataTableCell>
                    <DataTableCell className="text-sm">{order.insuranceCompany.name}</DataTableCell>
                    <DataTableCell className="font-medium text-amber-700">
                      {durationBetween(order.reportedAt)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={`Kapatılan ${domainLabels.workOrder.many} — Çözüm Süresi`} />
          <CardBody flush>
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Dosya No</DataTableHeader>
                <DataTableHeader>{domainLabels.insuranceCompany.one}</DataTableHeader>
                <DataTableHeader>Durum</DataTableHeader>
                <DataTableHeader>Çözüm süresi</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {completedOrders.map((order) => (
                  <DataTableRow key={order.id}>
                    <DataTableCell>
                      <span className="font-mono text-xs">{order.title}</span>
                      <p className="mt-0.5 text-xs text-zinc-500">{order.ticketNo}</p>
                    </DataTableCell>
                    <DataTableCell className="text-sm">{order.insuranceCompany.name}</DataTableCell>
                    <DataTableCell>
                      <Badge className={workOrderStatusColors[order.status]}>
                        {workOrderStatusLabels[order.status]}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="font-medium text-indigo-600">
                      {order.completedAt ? durationBetween(order.reportedAt, order.completedAt) : "—"}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
