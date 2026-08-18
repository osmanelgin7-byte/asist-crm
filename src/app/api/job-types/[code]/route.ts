import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { user, error } = await requirePermission("settings:manage");
  if (error) return error;

  const { code } = await params;
  const existing = await prisma.jobTypeDefinition.findUnique({ where: { code } });
  if (!existing) {
    return NextResponse.json({ error: "İş türü bulunamadı" }, { status: 404 });
  }

  const body = await request.json();
  const data: { label?: string; sortOrder?: number; active?: boolean } = {};

  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label) {
      return NextResponse.json({ error: "İş türü adı boş olamaz" }, { status: 400 });
    }
    data.label = label;
  }

  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json({ error: "Geçersiz sıra numarası" }, { status: 400 });
    }
    data.sortOrder = sortOrder;
  }

  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  const updated = await prisma.jobTypeDefinition.update({
    where: { code },
    data,
  });

  const usageCount = await prisma.workOrder.count({ where: { jobType: code } });

  logActivity({
    userId: user!.id,
    action: "update",
    entityType: "job_type",
    entityId: updated.code,
    entityLabel: updated.label,
  });

  return NextResponse.json({ ...updated, usageCount });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { user, error } = await requirePermission("settings:manage");
  if (error) return error;

  const { code } = await params;
  const existing = await prisma.jobTypeDefinition.findUnique({ where: { code } });
  if (!existing) {
    return NextResponse.json({ error: "İş türü bulunamadı" }, { status: 404 });
  }

  await prisma.jobTypeDefinition.delete({ where: { code } });

  logActivity({
    userId: user!.id,
    action: "delete",
    entityType: "job_type",
    entityId: code,
    entityLabel: existing.label,
  });

  return NextResponse.json({ ok: true });
}
