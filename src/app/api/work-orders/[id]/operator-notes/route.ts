import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission("orders:read");
  if (error) return error;

  const { id } = await params;

  const order = await prisma.workOrder.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  const notes = await prisma.workOrderOperatorNote.findMany({
    where: { workOrderId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: note.author,
    }))
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePermission("orders:write");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Not metni boş olamaz" }, { status: 400 });
  }

  const order = await prisma.workOrder.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  }

  const note = await prisma.workOrderOperatorNote.create({
    data: {
      workOrderId: id,
      authorId: user!.id,
      content,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: note.author,
    },
    { status: 201 }
  );
}
