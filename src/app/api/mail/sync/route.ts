import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTabAccess } from "@/lib/api-auth";
import { getMailSettings, isMailConfigured } from "@/lib/mail/mail-settings";
import { syncInboxFromImap, summarizeMailSyncResult } from "@/lib/mail/mail-sync";
import { formatMailConnectionError } from "@/lib/mail/mail-tls";

export async function POST() {
  const { error } = await requireTabAccess("mail", "mail:write");
  if (error) return error;

  const settings = await getMailSettings(prisma);
  if (!isMailConfigured(settings)) {
    return NextResponse.json(
      { error: "Gelen kutusu senkronu için Ayarlar → E-posta bölümünü yapılandırın" },
      { status: 400 }
    );
  }

  try {
    const result = summarizeMailSyncResult(await syncInboxFromImap(prisma, settings));
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: formatMailConnectionError(err, "imap") },
      { status: 500 }
    );
  }
}
