import type { PrismaClient } from "@prisma/client";
import { WorkOrderStatus } from "@prisma/client";

export const billableInvoiceStatuses = [
  WorkOrderStatus.TAMAMLANDI,
  WorkOrderStatus.SERVIS_BEDELI_ILE_TAMAMLANDI,
] as const;

export function normalizeWorkOrderIds(workOrderIds: unknown): string[] {
  if (!Array.isArray(workOrderIds)) return [];
  return [
    ...new Set(
      workOrderIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim())
    ),
  ];
}

export async function recalculateFirmInvoiceTotal(prisma: PrismaClient, firmInvoiceId: string) {
  const items = await prisma.firmInvoiceItem.findMany({
    where: { firmInvoiceId },
    include: { workOrder: { select: { invoiceAmount: true } } },
  });

  const totalAmount = items.reduce((sum, item) => sum + item.workOrder.invoiceAmount, 0);

  return prisma.firmInvoice.update({
    where: { id: firmInvoiceId },
    data: { totalAmount },
    include: { _count: { select: { items: true } } },
  });
}

export async function validatePendingWorkOrdersForBrand(
  prisma: PrismaClient,
  brand: string,
  workOrderIds: string[]
) {
  if (workOrderIds.length === 0) {
    return { error: "En az bir iş seçilmelidir" as const };
  }

  const pendingOrders = await prisma.workOrder.findMany({
    where: {
      id: { in: workOrderIds },
      status: { in: [...billableInvoiceStatuses] },
      insuranceCompany: { shortCode: brand },
      firmInvoiceItem: null,
    },
    select: { id: true, invoiceAmount: true },
  });

  if (pendingOrders.length === 0) {
    return { error: "Seçilen işler bulunamadı veya zaten faturalanmış" as const };
  }

  if (pendingOrders.length !== workOrderIds.length) {
    return {
      error: "Bazı seçilen işler bu firmaya ait değil, tamamlanmamış veya zaten faturalanmış" as const,
    };
  }

  return { pendingOrders };
}
