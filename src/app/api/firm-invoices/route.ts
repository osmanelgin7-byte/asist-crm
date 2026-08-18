import { NextResponse } from "next/server";
import { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";

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

  const uniqueIds = [
    ...new Set(
      workOrderIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim())
    ),
  ];
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "En az bir iş seçilmelidir" }, { status: 400 });
  }

  const existingNo = await prisma.firmInvoice.findUnique({
    where: { invoiceNo: invoiceNo.trim() },
  });
  if (existingNo) {
    return NextResponse.json({ error: "Bu fatura numarası zaten kayıtlı" }, { status: 400 });
  }

  const pendingWhere = {
    status: { in: [WorkOrderStatus.TAMAMLANDI, WorkOrderStatus.SERVIS_BEDELI_ILE_TAMAMLANDI] },
    insuranceCompany: { shortCode: brand.trim() },
    firmInvoiceItem: null,
    id: { in: uniqueIds },
  };

  const pendingOrders = await prisma.workOrder.findMany({
    where: pendingWhere,
    select: { id: true, invoiceAmount: true },
  });

  if (pendingOrders.length === 0) {
    return NextResponse.json({ error: "Seçilen işler bulunamadı veya zaten faturalanmış" }, { status: 400 });
  }

  if (pendingOrders.length !== uniqueIds.length) {
    return NextResponse.json(
      { error: "Bazı seçilen işler bu firmaya ait değil, tamamlanmamış veya zaten faturalanmış" },
      { status: 400 }
    );
  }

  const totalAmount = pendingOrders.reduce((sum, o) => sum + o.invoiceAmount, 0);

  const invoice = await prisma.firmInvoice.create({
    data: {
      invoiceNo: invoiceNo.trim(),
      brand: brand.trim(),
      totalAmount,
      items: {
        create: pendingOrders.map((o) => ({ workOrderId: o.id })),
      },
    },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json(invoice, { status: 201 });
}
