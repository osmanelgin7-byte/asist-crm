import type { MailFolder } from "@prisma/client";
import { parseRecipientField } from "./mail-recipients";

type ReplyMessage = {
  folder: MailFolder;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  toRecipients: string;
  ccRecipients: string | null;
  bodyText: string | null;
};

function normalizeEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}

function uniqueRecipients(items: string[]): string[] {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeEmail(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function replySubject(subject: string) {
  return subject.trim().startsWith("Re:") ? subject.trim() : `Re: ${subject.trim()}`;
}

function replyQuote(message: ReplyMessage) {
  const author = message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail;
  return `\n\n---\n${author} yazdı:\n${message.bodyText ?? ""}`;
}

export function buildReplyTargets(message: ReplyMessage, accountEmail: string, replyAll: boolean) {
  const self = normalizeEmail(accountEmail);
  const toList = parseRecipientField(message.toRecipients);
  const ccList = parseRecipientField(message.ccRecipients);
  const subject = replySubject(message.subject);
  const quote = replyQuote(message);

  if (message.folder === "SENT" || message.folder === "DRAFTS") {
    if (replyAll) {
      const all = uniqueRecipients([...toList, ...ccList]).filter(
        (email) => normalizeEmail(email) !== self
      );
      return { to: all.join(", "), cc: "", subject, quote };
    }
    return { to: toList.join(", "), cc: ccList.join(", "), subject, quote };
  }

  const sender = message.fromEmail;
  if (replyAll) {
    const cc = uniqueRecipients([...toList, ...ccList]).filter((email) => {
      const normalized = normalizeEmail(email);
      return normalized !== self && normalized !== normalizeEmail(sender);
    });
    return { to: sender, cc: cc.join(", "), subject, quote };
  }

  return { to: sender, cc: "", subject, quote };
}

export function resolveUnarchiveFolder(message: {
  sentById?: string | null;
  externalId?: string | null;
  receivedAt?: string | null;
}): MailFolder {
  if (message.sentById) return "SENT";
  if (message.externalId || message.receivedAt) return "INBOX";
  return "DRAFTS";
}

export const REPLY_ALL_FOLDERS: MailFolder[] = ["INBOX", "SENT", "DRAFTS", "ARCHIVE"];
export const ARCHIVABLE_FOLDERS: MailFolder[] = ["INBOX", "SENT", "DRAFTS"];
