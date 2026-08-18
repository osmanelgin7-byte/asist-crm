import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import { deleteMailAttachmentFile } from "@/lib/mail/mail-files";
import type { MailFolder } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("mail", "mail:read");
  if (error) return error;

  const { id } = await params;
  const message = await prisma.mailMessage.findUnique({
    where: { id },
    include: {
      attachments: true,
      sentBy: { select: { id: true, name: true } },
    },
  });

  if (!message) {
    return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
  }

  if (!message.isRead && message.folder === "INBOX") {
    await prisma.mailMessage.update({ where: { id }, data: { isRead: true } });
    message.isRead = true;
  }

  return NextResponse.json(message);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("mail", "mail:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const data: { isRead?: boolean; isStarred?: boolean; folder?: MailFolder } = {};

  if (typeof body.isRead === "boolean") data.isRead = body.isRead;
  if (typeof body.isStarred === "boolean") data.isStarred = body.isStarred;
  if (
    body.folder === "TRASH" ||
    body.folder === "INBOX" ||
    body.folder === "SENT" ||
    body.folder === "DRAFTS" ||
    body.folder === "ARCHIVE"
  ) {
    data.folder = body.folder;
  }

  const message = await prisma.mailMessage.update({
    where: { id },
    data,
    include: { attachments: true },
  });

  return NextResponse.json(message);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireTabAccess("mail", "mail:write");
  if (error) return error;

  const { id } = await params;
  const message = await prisma.mailMessage.findUnique({
    where: { id },
    include: { attachments: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
  }

  if (message.folder !== "TRASH") {
    const moved = await prisma.mailMessage.update({
      where: { id },
      data: { folder: "TRASH" },
    });
    return NextResponse.json(moved);
  }

  for (const att of message.attachments) {
    await deleteMailAttachmentFile(att.storedPath);
  }
  await prisma.mailAttachment.deleteMany({ where: { messageId: id } });
  await prisma.mailMessage.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
