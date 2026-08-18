import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { contentDispositionHeader } from "@/lib/security";
import { getLeaveAttachmentAbsolutePath } from "@/lib/hr-leave-files";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("hr:read");
  if (error) return error;

  const { id } = await params;

  const record = await prisma.leaveRecord.findUnique({
    where: { id },
    select: { attachmentFileName: true, attachmentMimeType: true, attachmentPath: true },
  });

  if (!record?.attachmentPath || !record.attachmentFileName) {
    return NextResponse.json({ error: "Belge bulunamadı" }, { status: 404 });
  }

  try {
    const buffer = await readFile(getLeaveAttachmentAbsolutePath(record.attachmentPath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": record.attachmentMimeType ?? "application/octet-stream",
        "Content-Disposition": contentDispositionHeader(record.attachmentFileName),
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 404 });
  }
}
