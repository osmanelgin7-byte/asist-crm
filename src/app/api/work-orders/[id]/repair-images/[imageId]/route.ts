import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { contentDispositionHeader } from "@/lib/security";
import {
  deleteWorkOrderRepairImageFile,
  getWorkOrderRepairImageAbsolutePath,
} from "@/lib/work-order-files";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { error } = await requirePermission("orders:read");
  if (error) return error;

  const { id, imageId } = await params;
  const { searchParams } = new URL(request.url);
  const forceDownload = searchParams.get("download") === "1";

  const image = await prisma.workOrderRepairImage.findFirst({
    where: { id: imageId, workOrderId: id },
  });

  if (!image) {
    return NextResponse.json({ error: "Görsel bulunamadı" }, { status: 404 });
  }

  try {
    const buffer = await readFile(getWorkOrderRepairImageAbsolutePath(image.storedPath));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Disposition": contentDispositionHeader(image.fileName, !forceDownload),
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { error } = await requirePermission("orders:write");
  if (error) return error;

  const { id, imageId } = await params;

  const image = await prisma.workOrderRepairImage.findFirst({
    where: { id: imageId, workOrderId: id },
  });

  if (!image) {
    return NextResponse.json({ error: "Görsel bulunamadı" }, { status: 404 });
  }

  await deleteWorkOrderRepairImageFile(image.storedPath);
  await prisma.workOrderRepairImage.delete({ where: { id: imageId } });

  return NextResponse.json({ ok: true });
}
