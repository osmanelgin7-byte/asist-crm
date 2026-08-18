import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "mail");
export const MAX_MAIL_ATTACHMENT_SIZE = 15 * 1024 * 1024;
export const MAX_MAIL_ATTACHMENTS = 10;

const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".js", ".msi", ".scr", ".com",
]);

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 180) || "ek";
}

export function isAllowedAttachment(file: File): boolean {
  if (file.size > MAX_MAIL_ATTACHMENT_SIZE) return false;
  const ext = path.extname(file.name).toLowerCase();
  return !BLOCKED_EXTENSIONS.has(ext);
}

export async function saveMailAttachment(messageId: string, file: File) {
  if (!isAllowedAttachment(file)) {
    throw new Error(`${file.name}: en fazla 15 MB ve güvenli dosya türü olmalı`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = sanitizeFileName(file.name);
  const storedName = `${messageId}-${Date.now()}-${safeName}`;
  const absolutePath = path.join(UPLOAD_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return {
    fileName: safeName,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storedPath: storedName,
  };
}

export async function saveMailAttachmentBuffer(
  messageId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
) {
  if (buffer.length > MAX_MAIL_ATTACHMENT_SIZE) {
    throw new Error(`${fileName}: en fazla 15 MB olabilir`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const safeName = sanitizeFileName(fileName);
  const storedName = `${messageId}-${Date.now()}-${safeName}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return {
    fileName: safeName,
    mimeType: mimeType || "application/octet-stream",
    size: buffer.length,
    storedPath: storedName,
  };
}

export function getMailAttachmentAbsolutePath(storedName: string): string {
  return path.join(UPLOAD_DIR, path.basename(storedName));
}

export async function readMailAttachment(storedName: string) {
  return readFile(getMailAttachmentAbsolutePath(storedName));
}

export async function deleteMailAttachmentFile(storedName: string | null | undefined) {
  if (!storedName) return;
  try {
    await unlink(getMailAttachmentAbsolutePath(storedName));
  } catch {
    // missing file
  }
}
