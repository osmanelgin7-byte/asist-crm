import { connectImapClient } from "./imap-connect";
import nodemailer from "nodemailer";
import type { MailSetting } from "@prisma/client";
import { formatMailConnectionError, resolveSmtpTransport } from "./mail-tls";

export type MailConnectionTestResult =
  | { ok: true; imap: true; smtp: true }
  | { ok: false; imap: boolean; smtp: boolean; error: string; details?: { imap?: string; smtp?: string } };

export async function testImapConnection(settings: MailSetting): Promise<{ ok: true } | { ok: false; error: string }> {
  let lock: { release: () => void } | null = null;
  let client: Awaited<ReturnType<typeof connectImapClient>> | null = null;

  try {
    client = await connectImapClient(settings);
    lock = await client.getMailboxLock("INBOX");
    await client.status("INBOX", { messages: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatMailConnectionError(err, "imap") };
  } finally {
    try {
      lock?.release();
    } catch {
      /* ignore */
    }
    try {
      await client?.logout();
    } catch {
      /* ignore */
    }
  }
}

export async function testSmtpConnection(settings: MailSetting): Promise<{ ok: true } | { ok: false; error: string }> {
  const transporter = nodemailer.createTransport(resolveSmtpTransport(settings));

  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatMailConnectionError(err, "smtp") };
  }
}

export async function testMailConnections(settings: MailSetting): Promise<MailConnectionTestResult> {
  const imap = await testImapConnection(settings);
  if (!imap.ok) {
    return {
      ok: false,
      imap: false,
      smtp: false,
      error: `IMAP: ${imap.error}`,
      details: { imap: imap.error },
    };
  }

  const smtp = await testSmtpConnection(settings);
  if (!smtp.ok) {
    return {
      ok: false,
      imap: true,
      smtp: false,
      error: `SMTP: ${smtp.error}`,
      details: { smtp: smtp.error },
    };
  }

  return { ok: true, imap: true, smtp: true };
}
