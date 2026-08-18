import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import { deleteLeaveAttachment } from "@/lib/hr-leave-files";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("hr:leave:manage");
  if (error) return error;

  const { id } = await params;

  const record = await prisma.leaveRecord.findUnique({
    where: { id },
    select: { attachmentPath: true },
  });

  if (!record) {
    return NextResponse.json({ error: "İzin kaydı bulunamadı" }, { status: 404 });
  }

  await deleteLeaveAttachment(record.attachmentPath);
  await prisma.leaveRecord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
