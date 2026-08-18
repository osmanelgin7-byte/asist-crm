import { prisma } from "@/lib/prisma";

export interface RepairItemInput {
  description: string;
  amount: number;
}

export async function syncRepairItems(workOrderId: string, items: RepairItemInput[]) {
  const validItems = items.filter((i) => i.description.trim() && i.amount > 0);
  const invoiceAmount = validItems.reduce((sum, i) => sum + i.amount, 0);

  await prisma.$transaction(async (tx) => {
    await tx.workOrderRepairItem.deleteMany({ where: { workOrderId } });
    if (validItems.length > 0) {
      await tx.workOrderRepairItem.createMany({
        data: validItems.map((item, index) => ({
          workOrderId,
          description: item.description.trim(),
          amount: item.amount,
          sortOrder: index,
        })),
      });
    }
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: { invoiceAmount },
    });
  });

  return invoiceAmount;
}
