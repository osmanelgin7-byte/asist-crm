import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import Link from "next/link";
import { Wrench, ArrowUpRight, Activity, FolderPlus, FolderCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card, CardHeader, CardBody,
  DataTable, DataTableHead, DataTableHeader, DataTableBody, DataTableRow, DataTableCell,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { describeActivity } from "@/lib/activity-log";
import { openWorkOrderFilter } from "@/lib/work-order-status";
import {
  countClosedWorkOrders,
  countOpenedWorkOrders,
  getReportIntervalBounds,
} from "@/lib/work-order-reporting";
import { DashboardWorkOrders } from "./dashboard-work-orders";
import { auth } from "@/auth";
import { canAccessTab } from "@/lib/app-tabs";
import type { AppTabId } from "@/lib/app-tabs";
import type { Role } from "@/lib/permissions";
import { domainLabels } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  const allowedTabs = (session?.user?.allowedTabs as AppTabId[] | null) ?? null;
  const canViewReporting = role ? canAccessTab(role, allowedTabs, "reporting") : false;

  const todayBounds = getReportIntervalBounds("day");

  const [openOrders, openWorkOrders, recentActivity, openedToday, closedToday] = await Promise.all([
    prisma.workOrder.count({ where: openWorkOrderFilter }),
    prisma.workOrder.findMany({
      where: openWorkOrderFilter,
      include: {
        insuranceCompany: { select: { name: true, shortCode: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
      take: 10,
    }),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    countOpenedWorkOrders(prisma, todayBounds.start, todayBounds.end),
    countClosedWorkOrders(prisma, todayBounds.start, todayBounds.end),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ana Sayfa"
        description="Operasyon özeti ve son sistem hareketleri"
        breadcrumb={["Ana Sayfa"]}
      />

      <div className="mb-6 flex flex-col items-start gap-4 rounded-3xl border border-zinc-200/80 bg-gradient-to-r from-slate-50 via-white to-orange-50/40 p-6 shadow-sm ring-1 ring-zinc-100 sm:flex-row sm:items-center sm:justify-between">
        <BrandLogo width={240} height={70} priority />
        <div>
          <p className="text-base font-semibold text-zinc-900">{APP_NAME}</p>
          <p className="mt-1 text-sm text-zinc-500">{APP_TAGLINE} operasyon paneli</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label={domainLabels.workOrder.open} value={openOrders} href="/work-orders" icon={Wrench} variant="warning" />
        <StatCard
          label="Bugün Açılan Dosya"
          value={openedToday}
          href={canViewReporting ? "/raporlama" : undefined}
          icon={FolderPlus}
          variant="default"
        />
        <StatCard
          label="Bugün Kapatılan Dosya"
          value={closedToday}
          href={canViewReporting ? "/raporlama" : undefined}
          icon={FolderCheck}
          variant="success"
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Son Değişiklikler"
          action={
            canViewReporting ? (
              <Link href="/raporlama" className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                Raporlama <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : undefined
          }
        />
        <CardBody flush>
          {recentActivity.length > 0 ? (
            <DataTable>
              <DataTableHead>
                <DataTableHeader>Kullanıcı</DataTableHeader>
                <DataTableHeader>İşlem</DataTableHeader>
                <DataTableHeader>Zaman</DataTableHeader>
              </DataTableHead>
              <DataTableBody>
                {recentActivity.map((log) => (
                  <DataTableRow key={log.id}>
                    <DataTableCell className="font-medium text-zinc-900">{log.user.name}</DataTableCell>
                    <DataTableCell className="text-zinc-600">{describeActivity(log)}</DataTableCell>
                    <DataTableCell className="text-xs text-zinc-500">{formatDateTime(log.createdAt)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Activity className="h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">Henüz kayıtlı bir değişiklik yok.</p>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-6">
        <DashboardWorkOrders orders={openWorkOrders} />
      </div>
    </div>
  );
}
