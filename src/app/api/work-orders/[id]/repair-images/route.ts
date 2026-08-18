import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity-log";
import {
  MAX_IMAGES_PER_UPLOAD,
  saveWorkOrderRepairImage,
} from "@/lib/work-order-files";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("orders:write");
  if (error) return error;

  const { id } = await params;
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    select: { id: true, ticketNo: true },
  });

  if (!workOrder) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "En az bir görsel seçin" }, { status: 400 });
  }

  if (files.length > MAX_IMAGES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `En fazla ${MAX_IMAGES_PER_UPLOAD} görsel yükleyebilirsiniz` },
      { status: 400 }
    );
  }

  const existingCount = await prisma.workOrderRepairImage.count({ where: { workOrderId: id } });

  try {
    let nextSort = existingCount;
    for (const file of files) {
      const saved = await saveWorkOrderRepairImage(id, file);
      await prisma.workOrderRepairImage.create({
        data: {
          workOrderId: id,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          storedPath: saved.storedPath,
          sortOrder: nextSort,
        },
      });
      nextSort += 1;
    }
  } catch (uploadError) {
    const message = uploadError instanceof Error ? uploadError.message : "Görsel yüklenemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const images = await prisma.workOrderRepairImage.findMany({
    where: { workOrderId: id },
    orderBy: { sortOrder: "asc" },
  });

  logActivity({
    userId: user!.id,
    action: "update",
    entityType: "work_order",
    entityId: id,
    entityLabel: workOrder.ticketNo,
    details: `${files.length} onarım görseli yüklendi`,
  });

  return NextResponse.json(images);
}
