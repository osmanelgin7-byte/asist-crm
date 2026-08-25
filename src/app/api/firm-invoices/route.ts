import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import {
  normalizeWorkOrderIds,
  validatePendingWorkOrdersForBrand,
} from "@/lib/firm-invoice-items";

export async function GET(request: Request) {
  const { error } = await requireTabAccess("invoices", "orders:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand");

  const invoices = await prisma.firmInvoice.findMany({
    where: brand ? { brand } : undefined,
    include: { _count: { select: { items: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const { error } = await requireTabAccess("invoices", "orders:write");
  if (error) return error;

  const body = await request.json();
  const { invoiceNo, brand, workOrderIds } = body;

  if (!invoiceNo?.trim() || !brand?.trim()) {
    return NextResponse.json({ error: "Fatura numarası ve firma gerekli" }, { status: 400 });
  }

  if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
    return NextResponse.json({ error: "En az bir iş seçilmelidir" }, { status: 400 });
  }

  const uniqueIds = normalizeWorkOrderIds(workOrderIds);
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "En az bir iş seçilmelidir" }, { status: 400 });
  }

  const existingNo = await prisma.firmInvoice.findUnique({
    where: { invoiceNo: invoiceNo.trim() },
  });
  if (existingNo) {
    return NextResponse.json({ error: "Bu fatura numarası zaten kayıtlı" }, { status: 400 });
  }

  const validated = await validatePendingWorkOrdersForBrand(prisma, brand.trim(), uniqueIds);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const totalAmount = validated.pendingOrders.reduce((sum, o) => sum + o.invoiceAmount, 0);

  const invoice = await prisma.firmInvoice.create({
    data: {
      invoiceNo: invoiceNo.trim(),
      brand: brand.trim(),
      totalAmount,
      items: {
        create: validated.pendingOrders.map((o) => ({ workOrderId: o.id })),
      },
    },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json(invoice, { status: 201 });
}
