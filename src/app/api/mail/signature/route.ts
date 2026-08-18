import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import { getMailSettings, maskMailSettings } from "@/lib/mail/mail-settings";

export async function GET() {
  const { error } = await requireTabAccess("mail", "mail:read");
  if (error) return error;

  const settings = await getMailSettings(prisma);
  return NextResponse.json({
    signatureText: settings.signatureText ?? "",
    signatureHtml: settings.signatureHtml ?? "",
  });
}

export async function PATCH(request: Request) {
  const { error } = await requireTabAccess("mail", "mail:write");
  if (error) return error;

  const body = await request.json();
  const signatureText = typeof body.signatureText === "string" ? body.signatureText.trim() : "";
  const signatureHtml = typeof body.signatureHtml === "string" ? body.signatureHtml.trim() : "";

  const updated = await prisma.mailSetting.update({
    where: { id: "default" },
    data: { signatureText: signatureText || null, signatureHtml: signatureHtml || null },
  });

  return NextResponse.json({
    ...maskMailSettings(updated),
    signatureText: updated.signatureText ?? "",
    signatureHtml: updated.signatureHtml ?? "",
  });
}
