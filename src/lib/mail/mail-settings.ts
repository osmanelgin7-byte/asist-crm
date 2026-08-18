import type { MailSetting, PrismaClient } from "@prisma/client";
import { normalizeMailTlsSettings } from "./mail-tls";

export async function getMailSettings(prisma: PrismaClient): Promise<MailSetting> {
  const existing = await prisma.mailSetting.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.mailSetting.create({ data: { id: "default" } });
}

export function isMailConfigured(settings: MailSetting): boolean {
  return getMailConfigurationIssues(settings).length === 0;
}

export function getMailConfigurationIssues(settings: MailSetting): string[] {
  const issues: string[] = [];
  if (!settings.imapHost?.trim()) issues.push("IMAP sunucusu");
  if (!settings.imapUser?.trim()) issues.push("IMAP kullanıcı adı");
  if (!settings.imapPass?.trim()) issues.push("IMAP şifresi");
  if (!settings.smtpHost?.trim()) issues.push("SMTP sunucusu");
  if (!settings.smtpUser?.trim()) issues.push("SMTP kullanıcı adı");
  if (!settings.smtpPass?.trim()) issues.push("SMTP şifresi");
  if (!settings.fromEmail?.trim()) issues.push("Gönderen e-posta adresi");
  return issues;
}

export function maskMailSettings(settings: MailSetting) {
  return {
    ...settings,
    imapPass: settings.imapPass ? "********" : "",
    smtpPass: settings.smtpPass ? "********" : "",
  };
}

export type MailSettingsInput = {
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  imapUser?: string;
  imapPass?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  fromName?: string;
  fromEmail?: string;
  signatureText?: string;
  signatureHtml?: string;
};

export function buildSettingsUpdate(
  current: MailSetting,
  input: MailSettingsInput
): MailSettingsInput {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  const imapPort = num(input.imapPort, current.imapPort);
  const smtpPort = num(input.smtpPort, current.smtpPort);
  const tls = normalizeMailTlsSettings({
    imapPort,
    imapSecure: typeof input.imapSecure === "boolean" ? input.imapSecure : current.imapSecure,
    smtpPort,
    smtpSecure: typeof input.smtpSecure === "boolean" ? input.smtpSecure : current.smtpSecure,
  });

  return {
    imapHost: str(input.imapHost) ?? current.imapHost ?? undefined,
    imapPort: tls.imapPort,
    imapSecure: tls.imapSecure,
    imapUser: str(input.imapUser) ?? current.imapUser ?? undefined,
    imapPass:
      str(input.imapPass) && input.imapPass !== "********"
        ? str(input.imapPass)
        : current.imapPass ?? undefined,
    smtpHost: str(input.smtpHost) ?? current.smtpHost ?? undefined,
    smtpPort: tls.smtpPort,
    smtpSecure: tls.smtpSecure,
    smtpUser: str(input.smtpUser) ?? current.smtpUser ?? undefined,
    smtpPass:
      str(input.smtpPass) && input.smtpPass !== "********"
        ? str(input.smtpPass)
        : current.smtpPass ?? undefined,
    fromName: str(input.fromName) ?? current.fromName ?? undefined,
    fromEmail: str(input.fromEmail) ?? current.fromEmail ?? undefined,
    signatureText:
      input.signatureText !== undefined
        ? str(input.signatureText) ?? ""
        : current.signatureText ?? undefined,
    signatureHtml:
      input.signatureHtml !== undefined
        ? str(input.signatureHtml) ?? ""
        : current.signatureHtml ?? undefined,
  };
}
