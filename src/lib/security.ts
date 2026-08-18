import type { Role } from "@/lib/permissions";

const VALID_ROLES = new Set<Role>(["ADMIN", "PLANLAMA"]);

export const MIN_PASSWORD_LENGTH = 8;

export function parseRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const role = value.toUpperCase() as Role;
  return VALID_ROLES.has(role) ? role : null;
}

/** Prevent response-header injection via filenames. */
export function safeDownloadFileName(name: string): string {
  const cleaned = name
    .replace(/[\r\n"]/g, "")
    .replace(/[^\w.\-() ]+/g, "_")
    .trim()
    .slice(0, 120);
  return cleaned || "dosya";
}

export function contentDispositionHeader(fileName: string, inline = false): string {
  const safe = safeDownloadFileName(fileName);
  const type = inline ? "inline" : "attachment";
  return `${type}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır`;
  }
  return null;
}
