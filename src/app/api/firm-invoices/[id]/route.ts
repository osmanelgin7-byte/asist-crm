import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("invoices", "orders:read");
  if (error) return error;

  const { id } = await params;

  const invoice = await prisma.firmInvoice.findUnique({
    where: { id },
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
  });

  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("invoices", "orders:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const data: { dueDate?: Date | null; isPaid?: boolean } = {};

  if ("dueDate" in body) {
    if (body.dueDate === null || body.dueDate === "") {
      data.dueDate = null;
    } else if (typeof body.dueDate === "string") {
      const parsed = new Date(body.dueDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Geçersiz vade tarihi" }, { status: 400 });
      }
      data.dueDate = parsed;
    }
  }

  if ("isPaid" in body) {
    if (typeof body.isPaid !== "boolean") {
      return NextResponse.json({ error: "Geçersiz ödeme durumu" }, { status: 400 });
    }
    data.isPaid = body.isPaid;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const invoice = await prisma.firmInvoice.update({
    where: { id },
    data,
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json(invoice);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("invoices", "orders:write");
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.firmInvoice.findUnique({
    where: { id },
    select: { id: true, invoiceNo: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
  }

  await prisma.firmInvoice.delete({ where: { id } });

  return NextResponse.json({
    ok: true,
    message: `${existing.invoiceNo} silindi; faturadaki işler tekrar faturalanabilir.`,
  });
}
