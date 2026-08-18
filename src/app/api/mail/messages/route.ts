import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import type { MailFolder } from "@prisma/client";

const VALID_FOLDERS: MailFolder[] = ["INBOX", "SENT", "DRAFTS", "ARCHIVE", "TRASH"];

export async function GET(request: Request) {
  const { error } = await requireTabAccess("mail", "mail:read");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const folder = (searchParams.get("folder") ?? "INBOX") as MailFolder;
  const q = searchParams.get("q")?.trim() ?? "";

  if (!VALID_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "Geçersiz klasör" }, { status: 400 });
  }

  const messages = await prisma.mailMessage.findMany({
    where: {
      folder,
      ...(q
        ? {
            OR: [
              { subject: { contains: q } },
              { fromEmail: { contains: q } },
              { fromName: { contains: q } },
              { bodyText: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      attachments: { select: { id: true, fileName: true, mimeType: true, size: true } },
      sentBy: { select: { id: true, name: true } },
    },
    orderBy: [
      { receivedAt: "desc" },
      { sentAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 200,
  });

  const unreadCount = await prisma.mailMessage.count({
    where: { folder: "INBOX", isRead: false },
  });

  return NextResponse.json({ messages, unreadCount });
}

export async function POST(request: Request) {
  const { user, error } = await requireTabAccess("mail", "mail:write");
  if (error) return error;

  const settings = await prisma.mailSetting.findUnique({ where: { id: "default" } });
  if (!settings?.smtpHost || !settings.smtpUser || !settings.fromEmail) {
    return NextResponse.json(
      { error: "E-posta gönderimi için Ayarlar → E-posta bölümünü yapılandırın" },
      { status: 400 }
    );
  }

  const form = await request.formData();
  const toRaw = String(form.get("to") ?? "");
  const ccRaw = String(form.get("cc") ?? "");
  const bccRaw = String(form.get("bcc") ?? "");
  const subject = String(form.get("subject") ?? "");
  const body = String(form.get("body") ?? "");
  const files = form.getAll("attachments").filter((v): v is File => v instanceof File);

  const { sendMailMessage } = await import("@/lib/mail/mail-send");
  const { parseRecipients } = await import("@/lib/mail/mail-recipients");

  try {
    const message = await sendMailMessage(prisma, settings, user!.id, {
      to: parseRecipients(toRaw),
      cc: parseRecipients(ccRaw),
      bcc: parseRecipients(bccRaw),
      subject,
      body,
      attachmentFiles: files,
    });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    const { formatMailConnectionError } = await import("@/lib/mail/mail-tls");
    return NextResponse.json(
      { error: formatMailConnectionError(err, "smtp") },
      { status: 500 }
    );
  }
}
