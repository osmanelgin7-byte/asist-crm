import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import {
  normalizeWorkOrderIds,
  recalculateFirmInvoiceTotal,
  validatePendingWorkOrdersForBrand,
} from "@/lib/firm-invoice-items";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("invoices", "orders:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const workOrderIds = normalizeWorkOrderIds(body.workOrderIds);

  if (workOrderIds.length === 0) {
    return NextResponse.json({ error: "En az bir iş seçilmelidir" }, { status: 400 });
  }

  const invoice = await prisma.firmInvoice.findUnique({
    where: { id },
    select: { id: true, brand: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
  }

  const validated = await validatePendingWorkOrdersForBrand(prisma, invoice.brand, workOrderIds);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  await prisma.firmInvoiceItem.createMany({
    data: validated.pendingOrders.map((order) => ({
      firmInvoiceId: invoice.id,
      workOrderId: order.id,
    })),
  });

  const updated = await recalculateFirmInvoiceTotal(prisma, invoice.id);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("invoices", "orders:write");
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const workOrderId = searchParams.get("workOrderId")?.trim();

  if (!workOrderId) {
    return NextResponse.json({ error: "İş kimliği gerekli" }, { status: 400 });
  }

  const invoice = await prisma.firmInvoice.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
  }

  const item = await prisma.firmInvoiceItem.findFirst({
    where: { firmInvoiceId: id, workOrderId },
  });

  if (!item) {
    return NextResponse.json({ error: "İş bu faturada bulunamadı" }, { status: 404 });
  }

  if (invoice._count.items <= 1) {
    return NextResponse.json(
      { error: "Son kalemi çıkarmak için faturayı silin veya yeni iş ekleyin" },
      { status: 400 }
    );
  }

  await prisma.firmInvoiceItem.delete({ where: { id: item.id } });

  const updated = await recalculateFirmInvoiceTotal(prisma, id);
  return NextResponse.json(updated);
}
