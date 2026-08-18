import { prisma } from "./prisma.js";

export interface ResponsibleOption {
  id: string;
  name: string;
}

export async function getActiveResponsibles(): Promise<ResponsibleOption[]> {
  return prisma.user.findMany({
    where: { role: "PLANLAMA", active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function resolveResponsibleId(
  assignedToId: unknown
): Promise<{ id: string | null } | { error: string }> {
  if (assignedToId === null || assignedToId === undefined || assignedToId === "") {
    return { id: null };
  }
  if (typeof assignedToId !== "string") {
    return { error: "Geçersiz koordinatör" };
  }

  const user = await prisma.user.findFirst({
    where: { id: assignedToId, role: "PLANLAMA", active: true },
    select: { id: true },
  });

  if (!user) {
    return { error: "Seçilen koordinatör bulunamadı veya aktif değil" };
  }

  return { id: user.id };
}
