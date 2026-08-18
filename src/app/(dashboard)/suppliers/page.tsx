import { prisma } from "@/lib/prisma";
import { getServerAccess } from "@/lib/session-access";
import { buildSupplierSearchWhere, parseSupplierSearchParams } from "@/lib/supplier-search";
import { SuppliersPanel } from "./suppliers-panel";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SuppliersPage({ searchParams }: PageProps) {
  const access = await getServerAccess();
  const canWrite = access?.can("suppliers:write") ?? false;
  const filters = parseSupplierSearchParams(await searchParams);
  const where = await buildSupplierSearchWhere(prisma, filters);

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      _count: { select: { workOrders: true, ledgerEntries: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return <SuppliersPanel suppliers={suppliers} canWrite={canWrite} initialFilters={filters} />;
}
