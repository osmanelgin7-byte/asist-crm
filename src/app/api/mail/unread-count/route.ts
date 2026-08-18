import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireTabAccess("mail", "mail:read");
  if (error) return error;

  const unreadCount = await prisma.mailMessage.count({
    where: { folder: "INBOX", isRead: false },
  });

  return NextResponse.json({ unreadCount });
}
