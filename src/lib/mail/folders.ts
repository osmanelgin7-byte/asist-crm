import type { MailFolder } from "@prisma/client";

export const MAIL_FOLDERS: {
  id: MailFolder;
  label: string;
  icon: "inbox" | "send" | "draft" | "archive" | "trash";
}[] = [
  { id: "INBOX", label: "Gelen Kutusu", icon: "inbox" },
  { id: "SENT", label: "Gönderilen", icon: "send" },
  { id: "DRAFTS", label: "Taslaklar", icon: "draft" },
  { id: "ARCHIVE", label: "Arşiv", icon: "archive" },
  { id: "TRASH", label: "Çöp Kutusu", icon: "trash" },
];

export function folderLabel(folder: MailFolder) {
  return MAIL_FOLDERS.find((f) => f.id === folder)?.label ?? folder;
}
