import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { recordSupplierPayment } from "@/lib/supplier-ledger";
import { domainLabels } from "@/lib/domain";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("suppliers:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { amount, description } = body;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) {
    return NextResponse.json({ error: `${domainLabels.supplier.one} bulunamadı` }, { status: 404 });
  }

  const paymentAmount = Number(amount);
  if (!paymentAmount || paymentAmount <= 0) {
    return NextResponse.json({ error: "Geçerli bir ödeme tutarı girin" }, { status: 400 });
  }

  await recordSupplierPayment(id, paymentAmount, description);

  const updated = await prisma.supplier.findUnique({
    where: { id },
    include: {
      ledgerEntries: {
        include: {
          workOrder: {
            select: { id: true, ticketNo: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(updated);
}
