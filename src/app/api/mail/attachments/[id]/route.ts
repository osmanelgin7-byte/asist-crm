import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import { readMailAttachment } from "@/lib/mail/mail-files";
import { contentDispositionHeader } from "@/lib/security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("mail", "mail:read");
  if (error) return error;

  const { id } = await params;
  const attachment = await prisma.mailAttachment.findUnique({
    where: { id },
    include: { message: { select: { folder: true } } },
  });

  if (!attachment) {
    return NextResponse.json({ error: "Ek bulunamadı" }, { status: 404 });
  }

  try {
    const buffer = await readMailAttachment(attachment.storedPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": contentDispositionHeader(attachment.fileName),
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya okunamadı" }, { status: 404 });
  }
}
