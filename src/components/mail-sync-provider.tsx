"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { apiFetch, readApiJson } from "@/lib/api-client";
import { canAccessTab } from "@/lib/app-tabs";
import type { Role } from "@/lib/permissions";
import {
  MAIL_AUTO_SYNC_MS,
  requestNotificationPermission,
  showMailNotifications,
  type MailNotifyItem,
} from "@/lib/mail/mail-notify";
import Link from "next/link";

interface InboxMessageRow {
  id: string;
  subject: string;
  fromName: string | null;
  fromEmail: string;
}

type MailSyncContextValue = {
  unreadCount: number;
  syncing: boolean;
  lastSyncAt: Date | null;
  configured: boolean | null;
  syncError: string | null;
  syncInfo: string | null;
  syncVersion: number;
  syncNow: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
};

const MailSyncContext = createContext<MailSyncContextValue | null>(null);

export function useMailSync() {
  const ctx = useContext(MailSyncContext);
  if (!ctx) {
    throw new Error("useMailSync must be used within MailSyncProvider");
  }
  return ctx;
}

export function useMailSyncOptional() {
  return useContext(MailSyncContext);
}

export function MailSyncProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const role = session?.user?.role as Role | undefined;
  const allowedTabs = session?.user?.allowedTabs ?? null;
  const canUseMail =
    status === "authenticated" &&
    role &&
    canAccessTab(role, allowedTabs, "mail");

  const [unreadCount, setUnreadCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [syncVersion, setSyncVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const syncingRef = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!canUseMail) return;
    const res = await apiFetch("/api/mail/unread-count");
    if (!res.ok) return;
    const data = await readApiJson(res);
    setUnreadCount(Number(data.unreadCount ?? 0));
  }, [canUseMail]);

  useEffect(() => {
    if (!canUseMail) return;
    void requestNotificationPermission();
  }, [canUseMail]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  const syncNow = useCallback(async () => {
    if (!canUseMail || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      const settingsRes = await apiFetch("/api/mail/settings");
      if (!settingsRes.ok) {
        const settingsData = await readApiJson(settingsRes);
        setSyncError(typeof settingsData.error === "string" ? settingsData.error : "E-posta ayarları okunamadı");
        return;
      }
      const settings = await readApiJson(settingsRes);
      const isConfigured = Boolean(settings.configured);
      setConfigured(isConfigured);
      if (!isConfigured) {
        setSyncError("E-posta hesabı eksik. Ayarlar → E-posta bölümünden IMAP/SMTP bilgilerini tamamlayın.");
        return;
      }

      const syncRes = await apiFetch("/api/mail/sync", { method: "POST" });
      const syncData = await readApiJson(syncRes);
      if (!syncRes.ok) {
        setSyncInfo(null);
        setSyncError(typeof syncData.error === "string" ? syncData.error : "Gelen kutusu senkronu başarısız");
        return;
      }

      setSyncError(null);
      const imported = Number(syncData.imported ?? 0);
      const scanned = Number(syncData.scanned ?? 0);
      const message =
        typeof syncData.message === "string"
          ? syncData.message
          : imported > 0
            ? `${imported} yeni mail içe aktarıldı.`
            : scanned > 0
              ? `${scanned} mail tarandı; yeni mail yok.`
              : "Senkron tamamlandı.";

      if (imported > 0) {
        setSyncInfo(message);
      } else if (Array.isArray(syncData.errors) && syncData.errors.length > 0) {
        setSyncInfo(null);
        setSyncError(`${message} ${String(syncData.errors[0])}`);
      } else {
        setSyncInfo(message);
      }

      const listRes = await apiFetch("/api/mail/messages?folder=INBOX");
      if (!listRes.ok) return;
      const data = await readApiJson(listRes);
      const messages = (data.messages as InboxMessageRow[] | undefined) ?? [];
      setUnreadCount(Number(data.unreadCount ?? 0));

      const newcomers = messages.filter((m) => !knownIdsRef.current.has(m.id));
      if (initializedRef.current && newcomers.length > 0) {
        const notifyItems: MailNotifyItem[] = newcomers.map((m) => ({
          id: m.id,
          subject: m.subject,
          fromName: m.fromName,
          fromEmail: m.fromEmail,
        }));
        showMailNotifications(notifyItems, setToast);
      }

      for (const m of messages) {
        knownIdsRef.current.add(m.id);
      }
      initializedRef.current = true;
      setLastSyncAt(new Date());
      setSyncVersion((v) => v + 1);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [canUseMail]);

  useEffect(() => {
    if (!canUseMail) return;

    void syncNow();
    const syncTimer = setInterval(() => {
      void syncNow();
    }, MAIL_AUTO_SYNC_MS);

    void refreshUnreadCount();
    const unreadTimer = setInterval(() => {
      void refreshUnreadCount();
    }, 15_000);

    return () => {
      clearInterval(syncTimer);
      clearInterval(unreadTimer);
    };
  }, [canUseMail, syncNow, refreshUnreadCount]);

  return (
    <MailSyncContext.Provider
      value={{
        unreadCount,
        syncing,
        lastSyncAt,
        configured,
        syncError,
        syncInfo,
        syncVersion,
        syncNow,
        refreshUnreadCount,
        setUnreadCount,
      }}
    >
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] max-w-sm animate-fade-in rounded-2xl border border-indigo-200 bg-white p-4 shadow-xl ring-1 ring-indigo-100">
          <p className="text-sm font-semibold text-zinc-900">Yeni e-posta</p>
          <p className="mt-1 text-sm text-zinc-600">{toast}</p>
          <Link
            href="/eposta"
            className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Gelen kutusunu aç →
          </Link>
        </div>
      )}
    </MailSyncContext.Provider>
  );
}
