import type { PrismaClient } from "@prisma/client";

export interface JobTypeDefinitionRow {
  code: string;
  label: string;
  sortOrder: number;
  active: boolean;
}

export const DEFAULT_JOB_TYPE_DEFINITIONS: JobTypeDefinitionRow[] = [
  { code: "YOL_YARDIMI", label: "Yol yardımı / Çekici", sortOrder: 0, active: true },
  { code: "IKAME_ARAC", label: "İkame araç", sortOrder: 1, active: true },
  { code: "KONAKLAMA", label: "Konaklama", sortOrder: 2, active: true },
  { code: "CAM_HASAR", label: "Cam hasarı", sortOrder: 3, active: true },
  { code: "MINI_ONARIM", label: "Mini onarım", sortOrder: 4, active: true },
  { code: "SAGLIK_ASIST", label: "Sağlık asistansı", sortOrder: 5, active: true },
  { code: "HUKUK_DANISMAN", label: "Hukuk danışmanlığı", sortOrder: 6, active: true },
  { code: "DIGER", label: "Diğer", sortOrder: 7, active: true },
];

/** @deprecated Use buildJobTypeLabelMap() with DB rows instead */
export const jobTypeLabels = Object.fromEntries(
  DEFAULT_JOB_TYPE_DEFINITIONS.map((item) => [item.code, item.label])
);

/** @deprecated Use toJobTypeOptions() with DB rows instead */
export const jobTypeOptions = DEFAULT_JOB_TYPE_DEFINITIONS.filter((item) => item.active).map((item) => ({
  value: item.code,
  label: item.label,
}));

const TR_CHAR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
};

export function slugifyJobTypeCode(label: string): string {
  const normalized = label
    .trim()
    .split("")
    .map((char) => TR_CHAR_MAP[char] ?? char)
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "IS_TURU";
}

export function buildJobTypeLabelMap(definitions: { code: string; label: string }[]) {
  return Object.fromEntries(definitions.map((item) => [item.code, item.label]));
}

export function toJobTypeOptions(definitions: JobTypeDefinitionRow[]) {
  return definitions
    .filter((item) => item.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "tr"))
    .map((item) => ({ value: item.code, label: item.label }));
}

export async function ensureDefaultJobTypes(prisma: PrismaClient) {
  for (const item of DEFAULT_JOB_TYPE_DEFINITIONS) {
    await prisma.jobTypeDefinition.upsert({
      where: { code: item.code },
      create: item,
      update: {},
    });
  }
}

export async function listJobTypeDefinitions(prisma: PrismaClient, activeOnly = false) {
  return prisma.jobTypeDefinition.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

export async function resolveJobTypeCode(prisma: PrismaClient, code: string) {
  const jobType = await prisma.jobTypeDefinition.findUnique({ where: { code } });
  if (!jobType || !jobType.active) {
    return { error: "Geçersiz veya pasif hizmet türü" } as const;
  }
  return { code: jobType.code } as const;
}
