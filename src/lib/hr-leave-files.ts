import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "hr-leaves");
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "belge";
}

export async function saveLeaveAttachment(leaveId: string, file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Dosya boyutu en fazla 10 MB olabilir");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Desteklenen formatlar: PDF, JPG, PNG, WEBP, DOC, DOCX");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const safeName = sanitizeFileName(file.name);
  const storedName = `${leaveId}-${Date.now()}-${safeName}`;
  const storedPath = path.join(UPLOAD_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storedPath, buffer);

  return {
    attachmentFileName: safeName,
    attachmentMimeType: file.type,
    attachmentPath: storedName,
  };
}

export function getLeaveAttachmentAbsolutePath(storedName: string): string {
  const safe = path.basename(storedName);
  return path.join(UPLOAD_DIR, safe);
}

export async function deleteLeaveAttachment(storedName: string | null | undefined) {
  if (!storedName) return;
  try {
    await unlink(getLeaveAttachmentAbsolutePath(storedName));
  } catch {
    // file may already be missing
  }
}
