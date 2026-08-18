import nodemailer from "nodemailer";
import type { MailSetting } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { saveMailAttachment, saveMailAttachmentBuffer } from "./mail-files";
import { parseRecipients } from "./mail-recipients";
import { resolveSmtpTransport } from "./mail-tls";
import { appendMailSignature, appendMailSignatureHtml } from "./mail-signature";

export type SendMailInput = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  replyToMessageId?: string;
  attachmentFiles?: File[];
};

export async function sendMailMessage(
  prisma: PrismaClient,
  settings: MailSetting,
  userId: string,
  input: SendMailInput
) {
  const to = input.to.filter(Boolean);
  if (to.length === 0) throw new Error("En az bir alıcı gerekli");
  if (!input.subject.trim()) throw new Error("Konu gerekli");

  const transporter = nodemailer.createTransport(resolveSmtpTransport(settings));

  const bodyText = appendMailSignature(input.body, settings.signatureText);
  const bodyHtml = settings.signatureHtml?.trim()
    ? appendMailSignatureHtml(textToHtml(input.body), settings.signatureText, settings.signatureHtml)
    : textToHtml(bodyText);

  const message = await prisma.mailMessage.create({
    data: {
      folder: "SENT",
      subject: input.subject.trim(),
      fromName: settings.fromName,
      fromEmail: settings.fromEmail!,
      toRecipients: JSON.stringify(to),
      ccRecipients: input.cc?.length ? JSON.stringify(input.cc) : null,
      bccRecipients: input.bcc?.length ? JSON.stringify(input.bcc) : null,
      bodyText,
      bodyHtml,
      isRead: true,
      sentById: userId,
      sentAt: new Date(),
      hasAttachments: (input.attachmentFiles?.length ?? 0) > 0,
    },
  });

  const attachmentPayload: { filename: string; content: Buffer; contentType?: string }[] = [];
  const savedAttachments = [];

  for (const file of input.attachmentFiles ?? []) {
    const saved = await saveMailAttachment(message.id, file);
    const content = Buffer.from(await file.arrayBuffer());
    attachmentPayload.push({
      filename: saved.fileName,
      content,
      contentType: saved.mimeType,
    });
    savedAttachments.push(saved);
  }

  if (savedAttachments.length > 0) {
    await prisma.mailAttachment.createMany({
      data: savedAttachments.map((a) => ({ ...a, messageId: message.id })),
    });
  }

  await transporter.sendMail({
    from: settings.fromName
      ? `"${settings.fromName}" <${settings.fromEmail}>`
      : settings.fromEmail!,
    to: to.join(", "),
    cc: input.cc?.join(", ") || undefined,
    bcc: input.bcc?.join(", ") || undefined,
    subject: input.subject.trim(),
    text: bodyText,
    html: bodyHtml,
    attachments: attachmentPayload,
  });

  return prisma.mailMessage.findUnique({
    where: { id: message.id },
    include: { attachments: true, sentBy: { select: { id: true, name: true } } },
  });
}

function textToHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
  return `<div style="font-family:sans-serif;font-size:14px;line-height:1.5">${escaped}</div>`;
}
