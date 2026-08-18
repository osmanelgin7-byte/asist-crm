import { prisma } from "@/lib/prisma";
import { getServerAccess } from "@/lib/session-access";
import { InvoicesPanel } from "./invoices-panel";
import { redirect } from "next/navigation";
import { canAccessTab } from "@/lib/app-tabs";
import type { AppTabId } from "@/lib/app-tabs";
import type { Role } from "@/lib/permissions";
import { listJobTypeDefinitions, buildJobTypeLabelMap } from "@/lib/job-types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ brand?: string }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const access = await getServerAccess();
  if (!access) redirect("/login");

  const allowedTabs = (access.allowedTabs as AppTabId[] | null) ?? null;
  if (!canAccessTab(access.role as Role, allowedTabs, "invoices")) {
    redirect("/");
  }

  if (!access.can("orders:read")) {
    redirect("/");
  }

  const canWrite = access.can("orders:write");
  const { brand: brandParam } = await searchParams;
  const selectedBrand = brandParam?.trim() || "";

  const companies = await prisma.insuranceCompany.findMany({
    orderBy: [{ shortCode: "asc" }, { name: "asc" }],
    select: { id: true, name: true, shortCode: true, city: true, address: true },
  });

  const brands = [...new Set(companies.map((c) => c.shortCode).filter(Boolean) as string[])].sort();

  const billableWhere = {
    status: { in: ["TAMAMLANDI", "SERVIS_BEDELI_ILE_TAMAMLANDI"] as ("TAMAMLANDI" | "SERVIS_BEDELI_ILE_TAMAMLANDI")[] },
    ...(selectedBrand ? { insuranceCompany: { shortCode: selectedBrand } } : {}),
  };

  const [pendingOrders, savedInvoices, jobTypeDefinitions] = await Promise.all([
    prisma.workOrder.findMany({
      where: { ...billableWhere, firmInvoiceItem: null },
      include: {
        insuranceCompany: {
          select: { id: true, name: true, shortCode: true, city: true, address: true },
        },
        repairItems: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ completedAt: "desc" }, { reportedAt: "desc" }],
    }),
    prisma.firmInvoice.findMany({
      where: selectedBrand ? { brand: selectedBrand } : undefined,
      include: {
        _count: { select: { items: true } },
        items: {
          include: {
            workOrder: {
              include: {
                insuranceCompany: {
                  select: { id: true, name: true, shortCode: true, city: true, address: true },
                },
                repairItems: { orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    }),
    listJobTypeDefinitions(prisma, true),
  ]);

  const jobTypeLabelMap = buildJobTypeLabelMap(jobTypeDefinitions);

  const serializedPending = pendingOrders.map((o) => ({
    id: o.id,
    ticketNo: o.ticketNo,
    asistansDosyaNo: o.asistansDosyaNo,
    title: o.title,
    jobType: o.jobType,
    status: o.status,
    invoiceAmount: o.invoiceAmount,
    completedAt: o.completedAt?.toISOString() ?? null,
    reportedAt: o.reportedAt.toISOString(),
    insuranceCompany: o.insuranceCompany,
    repairItems: o.repairItems.map((i) => ({ description: i.description, amount: i.amount })),
  }));

  const serializedInvoices = savedInvoices.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    brand: inv.brand,
    totalAmount: inv.totalAmount,
    issuedAt: inv.issuedAt.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    isPaid: inv.isPaid,
    itemCount: inv._count.items,
    items: inv.items.map((item) => ({
      id: item.workOrder.id,
      ticketNo: item.workOrder.ticketNo,
      asistansDosyaNo: item.workOrder.asistansDosyaNo,
      title: item.workOrder.title,
      jobType: item.workOrder.jobType,
      status: item.workOrder.status,
      invoiceAmount: item.workOrder.invoiceAmount,
      completedAt: item.workOrder.completedAt?.toISOString() ?? null,
      reportedAt: item.workOrder.reportedAt.toISOString(),
      insuranceCompany: item.workOrder.insuranceCompany,
      repairItems: item.workOrder.repairItems.map((r) => ({
        description: r.description,
        amount: r.amount,
      })),
    })),
  }));

  return (
    <InvoicesPanel
      pendingOrders={serializedPending}
      savedInvoices={serializedInvoices}
      brands={brands}
      selectedBrand={selectedBrand}
      canWrite={canWrite}
      jobTypeLabelMap={jobTypeLabelMap}
    />
  );
}
