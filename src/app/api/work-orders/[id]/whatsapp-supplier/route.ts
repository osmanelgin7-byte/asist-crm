import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import { domainLabels } from "@/lib/domain";
import { validateSupplierWhatsAppSend } from "@/lib/whatsapp-supplier-job";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("orders:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supplierId = typeof body.supplierId === "string" ? body.supplierId.trim() : "";

  if (!supplierId) {
    return NextResponse.json({ error: `Önce ${domainLabels.supplier.one.toLowerCase()} seçin.` }, { status: 400 });
  }

  const [order, supplier] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNo: true,
        insuredFirstName: true,
        insuredLastName: true,
        insuredPhone: true,
        insuredAddress: true,
        insuredCity: true,
        insuredDistrict: true,
      },
    }),
    prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    }),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }
  if (!supplier) {
    return NextResponse.json({ error: `${domainLabels.supplier.one} bulunamadı` }, { status: 404 });
  }

  const result = validateSupplierWhatsAppSend(order, supplier.phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supplierLabel = `${supplier.firstName} ${supplier.lastName}`.trim();
  const noteContent = `WhatsApp ile iletildi → ${supplierLabel} (${supplier.phone?.trim()})`;

  await prisma.workOrderOperatorNote.create({
    data: {
      workOrderId: id,
      authorId: user!.id,
      content: noteContent,
    },
  });

  logActivity({
    userId: user!.id,
    action: "update",
    entityType: "work_order",
    entityId: order.id,
    entityLabel: order.ticketNo,
    details: noteContent,
  });

  return NextResponse.json({
    url: result.url,
    message: result.message,
    phone: result.phone,
  });
}
