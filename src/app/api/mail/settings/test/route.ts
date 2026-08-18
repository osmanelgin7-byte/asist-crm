import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import {
  buildSettingsUpdate,
  getMailConfigurationIssues,
  getMailSettings,
  isMailConfigured,
} from "@/lib/mail/mail-settings";
import { testMailConnections } from "@/lib/mail/mail-test";
import type { MailSetting } from "@prisma/client";

export async function POST(request: Request) {
  const { error } = await requirePermission("settings:manage");
  if (error) return error;

  const current = await getMailSettings(prisma);
  const body = await request.json().catch(() => ({}));
  const useSavedOnly = Object.keys(body).length === 0;
  const data = useSavedOnly ? {} : buildSettingsUpdate(current, body);
  const candidate: MailSetting = useSavedOnly ? current : { ...current, ...data };

  const issues = getMailConfigurationIssues(candidate);
  if (issues.length > 0) {
    return NextResponse.json(
      {
        error: `Eksik alanlar: ${issues.join(", ")}`,
        issues,
        configured: false,
      },
      { status: 400 }
    );
  }

  const result = await testMailConnections(candidate);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        imap: result.imap,
        smtp: result.smtp,
        details: result.details,
        configured: isMailConfigured(current),
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "IMAP ve SMTP bağlantısı başarılı.",
    configured: isMailConfigured(current),
  });
}
