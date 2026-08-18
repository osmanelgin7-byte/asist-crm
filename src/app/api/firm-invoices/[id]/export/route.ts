import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import { contentDispositionHeader } from "@/lib/security";
import { firmInvoiceToXlsx } from "@/lib/export-firm-invoice";

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
      items: {
        include: {
          workOrder: {
            include: {
              insuranceCompany: true,
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

  const rows = invoice.items.map((item) => {
    const o = item.workOrder;
    return {
      invoiceNo: invoice.invoiceNo,
      brand: invoice.brand,
      companyName: o.insuranceCompany.name,
      companyCity: o.insuranceCompany.city,
      companyAddress: o.insuranceCompany.address,
      asistansDosyaNo: o.asistansDosyaNo,
      title: o.title,
      status: o.status,
      completedAt: o.completedAt,
      reportedAt: o.reportedAt,
      repairSummary: o.repairItems.map((i) => `${i.description} (${i.amount}₺)`).join("; "),
      invoiceAmount: o.invoiceAmount,
    };
  });

  rows.sort((a, b) => a.companyName.localeCompare(b.companyName, "tr"));

  const xlsx = await firmInvoiceToXlsx(invoice.invoiceNo, invoice.brand, rows, {
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    isPaid: invoice.isPaid,
  });
  const date = new Date(invoice.issuedAt).toISOString().slice(0, 10);
  const safeNo = invoice.invoiceNo.replace(/[^\w\-]+/g, "_");

  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDispositionHeader(`fatura-${safeNo}-${date}.xlsx`),
    },
  });
}
