export type MailNotifyItem = {
  id: string;
  subject: string;
  fromName: string | null;
  fromEmail: string;
};

export function formatMailSender(item: MailNotifyItem): string {
  return item.fromName ? `${item.fromName} <${item.fromEmail}>` : item.fromEmail;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showMailNotifications(
  items: MailNotifyItem[],
  onFallbackToast?: (message: string) => void
) {
  if (items.length === 0) return;

  const title =
    items.length === 1 ? items[0].subject : `${items.length} yeni e-posta`;
  const body =
    items.length === 1
      ? formatMailSender(items[0])
      : items
          .slice(0, 3)
          .map((m) => m.subject)
          .join(" · ");

  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    const notification = new Notification(title, {
      body,
      icon: "/asist-on-logo.svg",
      tag: `mail-${items.map((m) => m.id).join("-")}`,
    });
    notification.onclick = () => {
      window.focus();
      window.location.href = "/eposta";
      notification.close();
    };
  } else if (onFallbackToast) {
    onFallbackToast(`${title} — ${body}`);
  }
}

export const MAIL_AUTO_SYNC_MS = 30_000;
