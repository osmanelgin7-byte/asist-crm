import type { MailSetting } from "@prisma/client";

type MailConnectionError = {
  message?: string;
  responseText?: string;
  responseStatus?: string;
  executedCommand?: string;
  code?: string;
};

export function extractMailErrorDetail(err: unknown): string {
  if (!err || typeof err !== "object") {
    return err instanceof Error ? err.message : String(err ?? "Bilinmeyen hata");
  }

  const error = err as MailConnectionError;
  const parts: string[] = [];

  if (error.responseText?.trim()) {
    parts.push(error.responseText.trim());
  } else if (error.message?.trim() && error.message !== "Command failed") {
    parts.push(error.message.trim());
  } else if (error.message?.trim()) {
    parts.push(error.message.trim());
  }

  if (error.responseStatus && error.responseStatus !== "NO" && error.responseStatus !== "BAD") {
    parts.push(`(${error.responseStatus})`);
  }

  return parts.join(" ") || "Bilinmeyen hata";
}

/** IMAP: 993 = doğrudan TLS, 143 = STARTTLS (secure: false) */
export function resolveImapConnection(settings: MailSetting) {
  const port = settings.imapPort;
  const secure = port === 993 ? true : port === 143 ? false : settings.imapSecure;

  return {
    host: settings.imapHost!.trim(),
    port,
    secure,
    auth: {
      user: settings.imapUser!.trim(),
      pass: settings.imapPass!,
    },
    logger: false as const,
    tls: { minVersion: "TLSv1.2" as const },
    disableAutoIdle: true,
  };
}

/** SMTP: 465 = doğrudan TLS, 587/25 = STARTTLS (secure: false) */
export function resolveSmtpTransport(settings: MailSetting) {
  const port = settings.smtpPort;
  const secure = port === 465 ? true : port === 587 || port === 25 ? false : settings.smtpSecure;

  return {
    host: settings.smtpHost!,
    port,
    secure,
    requireTLS: port === 587 || port === 25,
    auth: {
      user: settings.smtpUser!,
      pass: settings.smtpPass!,
    },
    tls: { minVersion: "TLSv1.2" as const },
  };
}

export function normalizeMailTlsSettings(input: {
  imapPort?: number;
  imapSecure?: boolean;
  smtpPort?: number;
  smtpSecure?: boolean;
}) {
  const imapPort = input.imapPort ?? 993;
  const smtpPort = input.smtpPort ?? 587;

  return {
    imapPort,
    imapSecure: imapPort === 993 ? true : imapPort === 143 ? false : (input.imapSecure ?? true),
    smtpPort,
    smtpSecure: smtpPort === 465 ? true : smtpPort === 587 || smtpPort === 25 ? false : (input.smtpSecure ?? false),
  };
}

export function formatMailConnectionError(err: unknown, kind: "imap" | "smtp"): string {
  const raw = extractMailErrorDetail(err);
  const combined = `${raw} ${err instanceof Error ? err.message : ""}`.toLowerCase();

  if (/wrong version number|ssl routines|eproto|econnreset/i.test(combined)) {
    if (kind === "imap") {
      return "IMAP SSL hatası: Port 993 için “SSL/TLS” açık olmalı; port 143 kullanıyorsanız SSL kapalı (STARTTLS) olmalı.";
    }
    return "SMTP SSL hatası: Port 587 için “SSL/TLS” kapalı olmalı (STARTTLS); port 465 için SSL açık olmalı.";
  }

  if (/login is disabled|imap is disabled|imap4 is disabled|protocol disabled/i.test(combined)) {
    return `IMAP kapalı: ${raw}. Office 365 yönetici panelinden posta kutunuz için IMAP erişimini açtırın (Exchange → Alıcılar → posta kutusu → E-posta uygulamaları → IMAP).`;
  }

  if (/auth|credentials|535|534|authentication|login failed|invalid credentials|application-specific password|web login required/i.test(combined)) {
    return `Kimlik doğrulama başarısız: ${raw}. Kullanıcı adı tam e-posta olmalı; Gmail/Outlook için uygulama şifresi gerekebilir.`;
  }

  if (/certificate|self signed|unable_to_verify/i.test(combined)) {
    return "Sunucu sertifikası doğrulanamadı. Sunucu adresinin doğru olduğundan emin olun.";
  }

  if (/imap access is disabled|not enabled|disabled for this account/i.test(combined)) {
    return `IMAP kapalı: ${raw}. E-posta sağlayıcınızın ayarlarından IMAP erişimini açın.`;
  }

  if (/command failed/i.test(raw) && kind === "imap") {
    return `IMAP komutu reddedildi. Sunucu: ${raw}. IMAP sunucusu, port, kullanıcı adı (tam e-posta) ve uygulama şifresini kontrol edin.`;
  }

  return raw || "Bağlantı kurulamadı";
}
