import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import { domainLabels } from "@/lib/domain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("suppliers:read");
  if (error) return error;

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      ledgerEntries: {
        include: { workOrder: { select: { ticketNo: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: { select: { workOrders: true } },
    },
  });

  if (!supplier) {
    return NextResponse.json({ error: `${domainLabels.supplier.one} bulunamadı` }, { status: 404 });
  }

  return NextResponse.json(supplier);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("suppliers:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: `${domainLabels.supplier.one} bulunamadı` }, { status: 404 });
  }

  const firstName = body.firstName !== undefined ? String(body.firstName).trim() : existing.firstName;
  const lastName = body.lastName !== undefined ? String(body.lastName).trim() : existing.lastName;
  const iban =
    body.iban !== undefined
      ? String(body.iban).replace(/\s/g, "").toUpperCase()
      : existing.iban;

  if (!firstName || !lastName || !iban) {
    return NextResponse.json({ error: "Ad, soyad ve IBAN gerekli" }, { status: 400 });
  }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      firstName,
      lastName,
      iban,
      city: body.city !== undefined ? (body.city?.trim() || null) : existing.city,
      district: body.district !== undefined ? (body.district?.trim() || null) : existing.district,
      phone: body.phone !== undefined ? (body.phone?.trim() || null) : existing.phone,
      notes: body.notes !== undefined ? (body.notes?.trim() || null) : existing.notes,
    },
  });

  logActivity({
    userId: user!.id,
    action: "update",
    entityType: "supplier",
    entityId: supplier.id,
    entityLabel: `${supplier.firstName} ${supplier.lastName}`,
  });

  return NextResponse.json(supplier);
}
