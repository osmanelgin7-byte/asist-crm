import { prisma } from "@/lib/prisma";
import { domainLabels } from "@/lib/domain";

/** Talep kaydındaki tedarikçi ödemesini cariye borç olarak yansıtır. */
export async function syncSupplierLedger(
  workOrderId: string,
  ticketNo: string,
  newSupplierId: string | null,
  newCost: number
) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.supplierLedgerEntry.findUnique({
      where: { workOrderId },
    });

    if (existing) {
      await tx.supplier.update({
        where: { id: existing.supplierId },
        data: { balance: { decrement: existing.amount } },
      });
      await tx.supplierLedgerEntry.delete({ where: { id: existing.id } });
    }

    if (newSupplierId && newCost > 0) {
      await tx.supplierLedgerEntry.create({
        data: {
          type: "HIZMET",
          supplierId: newSupplierId,
          workOrderId,
          amount: newCost,
          description: `${ticketNo} — talep kaydı hizmet bedeli`,
        },
      });
      await tx.supplier.update({
        where: { id: newSupplierId },
        data: { balance: { increment: newCost } },
      });
    }
  });
}

/** Tedarikçiye yapılan ödemeyi cariye işler (bakiyeyi düşürür). */
export async function recordSupplierPayment(
  supplierId: string,
  amount: number,
  description?: string
) {
  if (amount <= 0) throw new Error("Ödeme tutarı sıfırdan büyük olmalı");

  await prisma.$transaction(async (tx) => {
    await tx.supplierLedgerEntry.create({
      data: {
        type: "ODEME",
        supplierId,
        amount,
        description: description?.trim() || `${domainLabels.supplier.one} ödemesi`,
      },
    });
    await tx.supplier.update({
      where: { id: supplierId },
      data: { balance: { decrement: amount } },
    });
  });
}
