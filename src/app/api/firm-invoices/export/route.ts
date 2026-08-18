import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import { contentDispositionHeader } from "@/lib/security";
import { firmInvoicesListToXlsx } from "@/lib/export-firm-invoices-list";

export async function GET(request: Request) {
  const { error } = await requireTabAccess("invoices", "orders:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand")?.trim();

  const invoices = await prisma.firmInvoice.findMany({
    where: brand ? { brand } : undefined,
    include: { _count: { select: { items: true } } },
    orderBy: { issuedAt: "desc" },
  });

  const rows = invoices.map((inv) => ({
    invoiceNo: inv.invoiceNo,
    brand: inv.brand,
    issuedAt: inv.issuedAt,
    dueDate: inv.dueDate,
    isPaid: inv.isPaid,
    itemCount: inv._count.items,
    totalAmount: inv.totalAmount,
  }));

  const xlsx = await firmInvoicesListToXlsx(rows);
  const date = new Date().toISOString().slice(0, 10);
  const suffix = brand ? `-${brand.replace(/[^\w\-]+/g, "_")}` : "";

  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDispositionHeader(`kayitli-faturalar${suffix}-${date}.xlsx`),
    },
  });
}
