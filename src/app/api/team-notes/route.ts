import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const notes = await prisma.teamNoteEntry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(notes);
  } catch (err) {
    console.error("Team notes load failed:", err);
    return NextResponse.json({ error: "Notlar yüklenemedi" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json({ error: "Not metni boş olamaz" }, { status: 400 });
    }

    const note = await prisma.teamNoteEntry.create({
      data: {
        content,
        authorId: user!.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("Team note save failed:", err);
    return NextResponse.json({ error: "Not kaydedilemedi" }, { status: 500 });
  }
}
