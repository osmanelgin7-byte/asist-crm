import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "work-orders");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES_PER_UPLOAD = 10;

const REPAIR_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120) || "gorsel";
}

export async function saveWorkOrderRepairImage(workOrderId: string, file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Görsel boyutu en fazla 10 MB olabilir");
  }

  if (!REPAIR_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("Onarım görselleri için JPG, PNG veya WEBP kullanın");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const safeName = sanitizeFileName(file.name);
  const storedName = `${workOrderId}-repair-${Date.now()}-${safeName}`;
  const storedPath = path.join(UPLOAD_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storedPath, buffer);

  return {
    fileName: safeName,
    mimeType: file.type,
    storedPath: storedName,
  };
}

export function getWorkOrderRepairImageAbsolutePath(storedName: string): string {
  return path.join(UPLOAD_DIR, path.basename(storedName));
}

export async function deleteWorkOrderRepairImageFile(storedName: string | null | undefined) {
  if (!storedName) return;
  try {
    await unlink(getWorkOrderRepairImageAbsolutePath(storedName));
  } catch {
    // file may already be missing
  }
}

export { MAX_IMAGES_PER_UPLOAD };
