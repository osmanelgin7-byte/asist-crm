import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireJobTypeManage } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import { slugifyJobTypeCode } from "@/lib/job-types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { user, error } = await requireJobTypeManage();
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

  let nextCode = code;
  if (typeof body.code === "string") {
    const requested = body.code.trim();
    if (!requested) {
      return NextResponse.json({ error: "Kod boş olamaz" }, { status: 400 });
    }
    nextCode = slugifyJobTypeCode(requested);
    if (nextCode !== code) {
      const taken = await prisma.jobTypeDefinition.findUnique({ where: { code: nextCode } });
      if (taken) {
        return NextResponse.json({ error: "Bu kod zaten kullanılıyor" }, { status: 409 });
      }
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (nextCode !== code) {
      await tx.workOrder.updateMany({
        where: { jobType: code },
        data: { jobType: nextCode },
      });
      await tx.jobTypeDefinition.create({
        data: {
          code: nextCode,
          label: data.label ?? existing.label,
          sortOrder: data.sortOrder ?? existing.sortOrder,
          active: data.active ?? existing.active,
        },
      });
      await tx.jobTypeDefinition.delete({ where: { code } });
      return tx.jobTypeDefinition.findUniqueOrThrow({ where: { code: nextCode } });
    }

    return tx.jobTypeDefinition.update({
      where: { code },
      data,
    });
  });

  const usageCount = await prisma.workOrder.count({ where: { jobType: updated.code } });

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
  const { user, error } = await requireJobTypeManage();
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
