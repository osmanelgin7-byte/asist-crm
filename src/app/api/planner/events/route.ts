import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

const ALLOWED_COLORS = new Set(["indigo", "violet", "emerald", "amber", "rose", "sky"]);

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  if (!from || !to) {
    return NextResponse.json({ error: "from ve to tarihleri gerekli" }, { status: 400 });
  }

  const events = await prisma.plannerEvent.findMany({
    where: {
      userId: user!.id,
      startAt: { gte: from, lte: to },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { title, description, startAt, endAt, allDay, color } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  const start = parseDate(startAt);
  if (!start) {
    return NextResponse.json({ error: "Geçerli bir başlangıç tarihi girin" }, { status: 400 });
  }

  const end = endAt ? parseDate(endAt) : null;
  if (endAt && !end) {
    return NextResponse.json({ error: "Geçerli bir bitiş tarihi girin" }, { status: 400 });
  }

  if (end && end < start) {
    return NextResponse.json({ error: "Bitiş, başlangıçtan önce olamaz" }, { status: 400 });
  }

  const event = await prisma.plannerEvent.create({
    data: {
      userId: user!.id,
      title: title.trim(),
      description: description?.trim() || null,
      startAt: start,
      endAt: end,
      allDay: Boolean(allDay),
      color: ALLOWED_COLORS.has(color) ? color : "indigo",
    },
  });

  return NextResponse.json(event, { status: 201 });
}
