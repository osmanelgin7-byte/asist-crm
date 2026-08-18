import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const ALLOWED_COLORS = new Set(["indigo", "violet", "emerald", "amber", "rose", "sky"]);

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getOwnedEvent(id: string, userId: string) {
  return prisma.plannerEvent.findFirst({
    where: { id, userId },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const existing = await getOwnedEvent(id, user!.id);
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, startAt, endAt, allDay, color } = body;

  if (title !== undefined && !title?.trim()) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  const start = startAt !== undefined ? parseDate(startAt) : existing.startAt;
  if (startAt !== undefined && !start) {
    return NextResponse.json({ error: "Geçerli bir başlangıç tarihi girin" }, { status: 400 });
  }

  const end =
    endAt === null || endAt === ""
      ? null
      : endAt !== undefined
        ? parseDate(endAt)
        : existing.endAt;

  if (endAt !== undefined && endAt && !end) {
    return NextResponse.json({ error: "Geçerli bir bitiş tarihi girin" }, { status: 400 });
  }

  if (end && start && end < start) {
    return NextResponse.json({ error: "Bitiş, başlangıçtan önce olamaz" }, { status: 400 });
  }

  const event = await prisma.plannerEvent.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(startAt !== undefined && start && { startAt: start }),
      ...(endAt !== undefined && { endAt: end }),
      ...(allDay !== undefined && { allDay: Boolean(allDay) }),
      ...(color !== undefined && { color: ALLOWED_COLORS.has(color) ? color : existing.color }),
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const existing = await getOwnedEvent(id, user!.id);
  if (!existing) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  await prisma.plannerEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
