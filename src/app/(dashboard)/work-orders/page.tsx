import { prisma } from "@/lib/prisma";
import { getServerAccess } from "@/lib/session-access";
import { openWorkOrderFilter, completedWorkOrderListFilter } from "@/lib/work-order-status";
import { WorkOrdersPanel } from "./work-orders-panel";
import { getActiveResponsibles } from "@/lib/responsibles";
import { listJobTypeDefinitions, toJobTypeOptions } from "@/lib/job-types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function WorkOrdersPage({ searchParams }: PageProps) {
  const { tab: tabParam } = await searchParams;
  const activeTab = tabParam === "completed" ? "completed" : "open";

  const access = await getServerAccess();
  const canWrite = access?.can("orders:write") ?? false;

  const openWhere = openWorkOrderFilter;
  const completedWhere = completedWorkOrderListFilter;

  const [orders, openCount, completedCount, responsibles, jobTypeDefinitions] =
    await Promise.all([
      prisma.workOrder.findMany({
        where: activeTab === "completed" ? completedWhere : openWhere,
        include: {
          insuranceCompany: true,
          assignedTo: { select: { id: true, name: true } },
          supplier: { select: { id: true, firstName: true, lastName: true, iban: true, balance: true } },
          repairItems: { orderBy: { sortOrder: "asc" } },
          firmInvoiceItem: { select: { id: true } },
        },
        orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
      }),
      prisma.workOrder.count({ where: openWhere }),
      prisma.workOrder.count({ where: completedWhere }),
      getActiveResponsibles(),
      listJobTypeDefinitions(prisma, true),
    ]);

  const serializedOrders = orders.map(({ firmInvoiceItem, ...o }) => ({
    ...o,
    hasFirmInvoice: firmInvoiceItem != null,
    reportedAt: o.reportedAt.toISOString(),
    appointmentAt: o.appointmentAt?.toISOString() ?? null,
    completedAt: o.completedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return (
    <WorkOrdersPanel
      activeTab={activeTab}
      orders={serializedOrders}
      counts={{ open: openCount, completed: completedCount }}
      canWrite={canWrite}
      responsibles={responsibles}
      jobTypeOptions={toJobTypeOptions(jobTypeDefinitions)}
    />
  );
}
