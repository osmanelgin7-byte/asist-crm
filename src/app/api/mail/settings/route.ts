import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireTabAccess } from "@/lib/api-auth";
import {
  buildSettingsUpdate,
  getMailSettings,
  isMailConfigured,
  maskMailSettings,
} from "@/lib/mail/mail-settings";

export async function GET() {
  const { error } = await requireTabAccess("mail", "mail:read");
  if (error) return error;

  const settings = await getMailSettings(prisma);
  return NextResponse.json({
    ...maskMailSettings(settings),
    configured: isMailConfigured(settings),
  });
}

export async function PUT(request: Request) {
  const { error } = await requirePermission("settings:manage");
  if (error) return error;

  const current = await getMailSettings(prisma);
  const body = await request.json();
  const data = buildSettingsUpdate(current, body);

  const updated = await prisma.mailSetting.update({
    where: { id: "default" },
    data,
  });

  return NextResponse.json({
    ...maskMailSettings(updated),
    configured: isMailConfigured(updated),
  });
}
