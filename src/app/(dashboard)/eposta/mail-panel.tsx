"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  MailPlus,
  Paperclip,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Star,
  Trash2,
  X,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { apiFetch, readApiJson } from "@/lib/api-client";
import { useMailSync } from "@/components/mail-sync-provider";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/form-fields";
import { cn, formatDateTime } from "@/lib/utils";
import { MAIL_FOLDERS } from "@/lib/mail/folders";
import {
  ARCHIVABLE_FOLDERS,
  REPLY_ALL_FOLDERS,
  buildReplyTargets,
  resolveUnarchiveFolder,
} from "@/lib/mail/mail-reply";
import { appendMailSignature, buildComposeBody } from "@/lib/mail/mail-signature";
import type { MailFolder } from "@prisma/client";

const FOLDER_ICONS = {
  inbox: Inbox,
  send: Send,
  draft: FileText,
  archive: Archive,
  trash: Trash2,
} as const;

interface MailAttachmentMeta {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface MailListItem {
  id: string;
  folder: MailFolder;
  subject: string;
  fromName: string | null;
  fromEmail: string;
  toRecipients: string;
  ccRecipients: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  attachments: MailAttachmentMeta[];
  sentBy: { id: string; name: string } | null;
  sentById?: string | null;
}

function parseRecipients(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.join(", ");
  } catch {
    return raw;
  }
  return raw;
}

function senderLabel(m: MailListItem) {
  if (m.folder === "SENT") return parseRecipients(m.toRecipients) || "Alıcı yok";
  return m.fromName ? `${m.fromName} <${m.fromEmail}>` : m.fromEmail;
}

function messageDate(m: MailListItem) {
  const d = m.receivedAt ?? m.sentAt ?? m.createdAt;
  return d ? formatDateTime(d) : "—";
}

function MailReaderBody({
  message,
  large = false,
}: {
  message: MailListItem;
  large?: boolean;
}) {
  return (
    <>
      <h2 className={cn("mail-subject font-bold tracking-tight", large ? "text-2xl sm:text-3xl" : "text-xl")}>
        {message.subject}
      </h2>
      <div className={cn("mt-4 space-y-1.5 text-zinc-600", large ? "text-base" : "text-sm")}>
        <p>
          <span className="font-semibold text-zinc-500">Kimden:</span> {senderLabel(message)}
        </p>
        <p>
          <span className="font-semibold text-zinc-500">Kime:</span> {parseRecipients(message.toRecipients)}
        </p>
        <p>
          <span className="font-semibold text-zinc-500">Tarih:</span> {messageDate(message)}
        </p>
      </div>
      {(message.attachments?.length ?? 0) > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {message.attachments.map((att) => (
            <a
              key={att.id}
              href={`/api/mail/attachments/${att.id}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 font-semibold text-indigo-700 hover:bg-indigo-50",
                large ? "px-4 py-2.5 text-sm" : "px-3 py-2 text-xs"
              )}
            >
              <Paperclip className="h-4 w-4" />
              {att.fileName}
            </a>
          ))}
        </div>
      )}
      <div
        className={cn(
          "prose mt-8 max-w-none text-zinc-800",
          large ? "prose-lg prose-p:text-[17px] prose-p:leading-[1.75] prose-headings:text-zinc-900" : "prose-sm"
        )}
      >
        {message.bodyHtml ? (
          <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
        ) : (
          <pre className={cn("whitespace-pre-wrap font-sans", large ? "text-[17px] leading-relaxed" : "text-sm")}>
            {message.bodyText ?? ""}
          </pre>
        )}
      </div>
    </>
  );
}

function MailMessageActions({
  message,
  onReply,
  onReplyAll,
  onArchive,
  onUnarchive,
  onStar,
  onTrash,
}: {
  message: MailListItem;
  onReply: () => void;
  onReplyAll: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onStar: () => void;
  onTrash: () => void;
}) {
  const canReply = REPLY_ALL_FOLDERS.includes(message.folder);
  const canArchive = ARCHIVABLE_FOLDERS.includes(message.folder);
  const canUnarchive = message.folder === "ARCHIVE";

  return (
    <>
      {canReply && (
        <>
          <Button variant="secondary" size="sm" onClick={onReply}>
            <Reply className="h-4 w-4" /> Yanıtla
          </Button>
          <Button variant="secondary" size="sm" onClick={onReplyAll}>
            <ReplyAll className="h-4 w-4" /> Tümünü Yanıtla
          </Button>
        </>
      )}
      {canArchive && (
        <Button variant="secondary" size="sm" onClick={onArchive}>
          <Archive className="h-4 w-4" /> Arşivle
        </Button>
      )}
      {canUnarchive && (
        <Button variant="secondary" size="sm" onClick={onUnarchive}>
          <ArchiveRestore className="h-4 w-4" /> Arşivden Çıkar
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={onStar}>
        <Star className={cn("h-4 w-4", message.isStarred && "fill-amber-400 text-amber-400")} />
      </Button>
      <Button variant="secondary" size="sm" onClick={onTrash}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
}

export function MailPanel() {
  const { unreadCount: globalUnread, syncing, configured, syncError, syncInfo, syncNow, lastSyncAt, syncVersion, refreshUnreadCount, setUnreadCount } =
    useMailSync();
  const [folder, setFolder] = useState<MailFolder>("INBOX");
  const [messages, setMessages] = useState<MailListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MailListItem | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeReplyAll, setComposeReplyAll] = useState(false);
  const [replyTo, setReplyTo] = useState<MailListItem | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [foldersCompact, setFoldersCompact] = useState(false);
  const [signatureText, setSignatureText] = useState("");
  const [signatureHtml, setSignatureHtml] = useState("");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState("");
  const [signatureHtmlDraft, setSignatureHtmlDraft] = useState("");
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerMessage, setReaderMessage] = useState<MailListItem | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mail-folders-compact");
    if (stored !== null) setFoldersCompact(stored === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("mail-folders-compact", String(foldersCompact));
  }, [foldersCompact]);

  useEffect(() => {
    void apiFetch("/api/mail/settings").then(async (res) => {
      if (!res.ok) return;
      const data = await readApiJson(res);
      setAccountEmail(typeof data.fromEmail === "string" ? data.fromEmail : "");
    });
  }, []);

  useEffect(() => {
    void apiFetch("/api/mail/signature").then(async (res) => {
      if (!res.ok) return;
      const data = await readApiJson(res);
      setSignatureText(typeof data.signatureText === "string" ? data.signatureText : "");
      setSignatureHtml(typeof data.signatureHtml === "string" ? data.signatureHtml : "");
    });
  }, []);

  function openSignatureEditor() {
    setSignatureDraft(signatureText);
    setSignatureHtmlDraft(signatureHtml);
    setSignatureOpen(true);
  }

  async function saveSignature() {
    setSignatureSaving(true);
    const res = await apiFetch("/api/mail/signature", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signatureText: signatureDraft,
        signatureHtml: signatureHtmlDraft,
      }),
    });
    const data = await readApiJson(res);
    setSignatureSaving(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "İmza kaydedilemedi");
      return;
    }
    setSignatureText(typeof data.signatureText === "string" ? data.signatureText : signatureDraft);
    setSignatureHtml(typeof data.signatureHtml === "string" ? data.signatureHtml : signatureHtmlDraft);
    setSignatureOpen(false);
  }

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ folder });
    if (search.trim()) params.set("q", search.trim());
    const res = await apiFetch(`/api/mail/messages?${params}`);
    if (res.ok) {
      const data = await readApiJson(res);
      const list = (data.messages as MailListItem[] | undefined) ?? [];
      setMessages(list);
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      } else if (folder === "INBOX") {
        void refreshUnreadCount();
      }

      const currentSelected = selectedIdRef.current;
      if (currentSelected) {
        const match = list.find((m) => m.id === currentSelected);
        if (match) {
          setSelectedMessage((prev) => (prev?.id === currentSelected ? { ...match, ...prev } : match));
        } else {
          setSelectedId(null);
          setSelectedMessage(null);
        }
      }
    } else {
      const data = await readApiJson(res);
      setError(typeof data.error === "string" ? data.error : "Mesajlar yüklenemedi");
    }
    setLoading(false);
  }, [folder, search, refreshUnreadCount, setUnreadCount]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages, syncVersion]);

  const refreshInbox = useCallback(async () => {
    if (configured !== false) {
      await syncNow();
    }
    await loadMessages();
  }, [configured, syncNow, loadMessages]);

  async function openCompose(reply?: MailListItem, replyAll = false) {
    setReplyTo(reply ?? null);
    setComposeReplyAll(replyAll);

    if (!signatureText.trim()) {
      const res = await apiFetch("/api/mail/signature");
      if (res.ok) {
        const data = await readApiJson(res);
        if (typeof data.signatureText === "string") setSignatureText(data.signatureText);
        if (typeof data.signatureHtml === "string") setSignatureHtml(data.signatureHtml);
      }
    }

    if (reply) {
      const targets = buildReplyTargets(reply, accountEmail, replyAll);
      setComposeTo(targets.to);
      setComposeCc(targets.cc);
      setComposeSubject(targets.subject);
      setComposeBody(buildComposeBody(targets.quote));
    } else {
      setComposeTo("");
      setComposeCc("");
      setComposeSubject("");
      setComposeBody(buildComposeBody());
    }
    setComposeFiles([]);
    setComposeOpen(true);
  }

  function clearMessageSelection(id: string) {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedMessage(null);
    }
    if (readerMessage?.id === id) {
      setReaderOpen(false);
      setReaderMessage(null);
    }
  }

  async function setMessageFolder(message: MailListItem, targetFolder: MailFolder) {
    const res = await apiFetch(`/api/mail/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: targetFolder }),
    });
    if (!res.ok) {
      const data = await readApiJson(res);
      setError(typeof data.error === "string" ? data.error : "İşlem başarısız");
      return false;
    }
    clearMessageSelection(message.id);
    await loadMessages();
    void refreshUnreadCount();
    return true;
  }

  async function archiveMessage(message: MailListItem) {
    return setMessageFolder(message, "ARCHIVE");
  }

  async function unarchiveMessage(message: MailListItem) {
    return setMessageFolder(message, resolveUnarchiveFolder({
      sentById: message.sentById ?? message.sentBy?.id ?? null,
      receivedAt: message.receivedAt,
    }));
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    const form = new FormData();
    form.set("to", composeTo);
    form.set("cc", composeCc);
    form.set("subject", composeSubject);
    form.set("body", appendMailSignature(composeBody, signatureText));
    composeFiles.forEach((f) => form.append("attachments", f));

    const res = await apiFetch("/api/mail/messages", { method: "POST", body: form });
    const data = await readApiJson(res);
    setSending(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Gönderilemedi");
      return;
    }

    setComposeOpen(false);
    setFolder("SENT");
    setSelectedId(typeof data.id === "string" ? data.id : null);
    await loadMessages();
  }

  async function toggleStar(message: MailListItem) {
    await apiFetch(`/api/mail/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: !message.isStarred }),
    });
    await loadMessages();
  }

  async function moveToTrash(message: MailListItem) {
    await apiFetch(`/api/mail/messages/${message.id}`, { method: "DELETE" });
    clearMessageSelection(message.id);
    await loadMessages();
    void refreshUnreadCount();
  }

  async function fetchMessageDetail(message: MailListItem): Promise<MailListItem | null> {
    const res = await apiFetch(`/api/mail/messages/${message.id}`);
    if (res.ok) {
      const detail = (await readApiJson(res)) as unknown as MailListItem;
      const merged: MailListItem = {
        ...message,
        ...detail,
        isRead: true,
        attachments: detail.attachments ?? message.attachments ?? [],
      };
      setMessages((prev) => prev.map((m) => (m.id === message.id ? merged : m)));
      void refreshUnreadCount();
      return merged;
    }
    const data = await readApiJson(res);
    setError(typeof data.error === "string" ? data.error : "Mesaj açılamadı");
    return null;
  }

  async function selectMessage(message: MailListItem) {
    setSelectedId(message.id);
    setSelectedMessage(message);
    const merged = await fetchMessageDetail(message);
    if (merged) {
      setSelectedMessage(merged);
      if (readerOpen && readerMessage?.id === message.id) {
        setReaderMessage(merged);
      }
    }
  }

  async function openReaderModal(message: MailListItem) {
    setSelectedId(message.id);
    setSelectedMessage(message);
    setReaderMessage(message);
    setReaderOpen(true);
    setReaderLoading(true);
    const merged = await fetchMessageDetail(message);
    setReaderLoading(false);
    if (merged) {
      setSelectedMessage(merged);
      setReaderMessage(merged);
    }
  }

  useEffect(() => {
    if (!readerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReaderOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readerOpen]);

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">E-posta</h1>
          <p className="text-sm text-zinc-500">
            Gelen kutusu, gönderim ve ekler — Yenile önce sunucudan çeker, sonra listeler
            {lastSyncAt && (
              <span className="text-zinc-400">
                {" "}
                · Son senkron: {formatDateTime(lastSyncAt.toISOString())} (otomatik 30 sn)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refreshInbox()} disabled={loading || syncing}>
            <RefreshCw className={cn("h-4 w-4", (loading || syncing) && "animate-spin")} /> Yenile
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void syncNow()} disabled={syncing}>
            <Inbox className={cn("h-4 w-4", syncing && "animate-pulse")} /> Gelenleri Çek
          </Button>
          <Button variant="accent" size="sm" onClick={() => openCompose()}>
            <MailPlus className="h-4 w-4" /> Yeni E-posta
          </Button>
        </div>
      </div>

      {configured === false && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          E-posta hesabı henüz yapılandırılmadı.{" "}
          <Link href="/ayarlar/eposta" className="font-semibold underline">
            Ayarlar → E-posta
          </Link>{" "}
          bölümünden IMAP/SMTP bilgilerinizi girin.
        </div>
      )}

      {syncInfo && !syncError && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {syncInfo}
        </div>
      )}

      {syncError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {syncError}{" "}
          <Link href="/ayarlar/eposta" className="font-semibold underline">
            Ayarları kontrol et
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-100">
        {/* Klasörler */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-zinc-100 bg-zinc-50/80 p-2 transition-all duration-200",
            foldersCompact ? "w-[4.5rem]" : "w-52 p-3"
          )}
        >
          <div className={cn("mb-2 flex items-center", foldersCompact ? "justify-center" : "justify-between px-1")}>
            {!foldersCompact && (
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">Klasörler</span>
            )}
            <button
              type="button"
              onClick={() => setFoldersCompact((v) => !v)}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white hover:text-indigo-600"
              title={foldersCompact ? "Klasör adlarını göster" : "Yalnızca simgeleri göster"}
              aria-label={foldersCompact ? "Klasör adlarını göster" : "Yalnızca simgeleri göster"}
            >
              {foldersCompact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {MAIL_FOLDERS.map((f) => {
            const Icon = FOLDER_ICONS[f.icon];
            const active = folder === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFolder(f.id); setSelectedId(null); setSelectedMessage(null); }}
                title={f.label}
                className={cn(
                  "relative mb-1 flex w-full items-center rounded-xl text-sm font-semibold transition-colors",
                  foldersCompact ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2.5 text-left",
                  active ? "bg-indigo-600 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                )}
              >
                <span className={cn("flex items-center gap-3", foldersCompact && "gap-0")}>
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.75} />
                  {!foldersCompact && <span>{f.label}</span>}
                </span>
                {!foldersCompact && f.id === "INBOX" && globalUnread > 0 && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                  )}>
                    {globalUnread}
                  </span>
                )}
                {foldersCompact && f.id === "INBOX" && globalUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white ring-2 ring-zinc-50">
                    {globalUnread > 9 ? "9+" : globalUnread}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={openSignatureEditor}
            title="E-posta imzası"
            className={cn(
              "mt-2 flex items-center rounded-xl text-xs font-semibold text-zinc-500 transition-colors hover:bg-white hover:text-indigo-700",
              foldersCompact ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2"
            )}
          >
            <PenLine className="h-3.5 w-3.5 shrink-0" />
            {!foldersCompact && "E-posta İmzası"}
          </button>

          <Link
            href="/ayarlar/eposta"
            title="Hesap ayarları"
            className={cn(
              "mt-auto flex items-center rounded-xl text-xs font-semibold text-zinc-500 hover:bg-white hover:text-zinc-800",
              foldersCompact ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2"
            )}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            {!foldersCompact && "Hesap Ayarları"}
          </Link>
        </aside>

        {/* Liste */}
        <section className="flex w-80 shrink-0 flex-col border-r border-zinc-100">
          <div className="border-b border-zinc-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ara…"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <p className="p-6 text-center text-sm text-zinc-400">Yükleniyor…</p>
            ) : messages.length === 0 ? (
              <p className="p-6 text-center text-sm text-zinc-400">Bu klasörde mesaj yok</p>
            ) : (
              messages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void selectMessage(m)}
                  onDoubleClick={() => void openReaderModal(m)}
                  className={cn(
                    "w-full border-b border-zinc-50 px-3 py-3 text-left transition-colors hover:bg-indigo-50/40",
                    selectedId === m.id && "bg-indigo-50 ring-1 ring-inset ring-indigo-100",
                    !m.isRead && folder === "INBOX" && "bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("truncate text-sm", !m.isRead ? "font-bold text-zinc-900" : "font-medium text-zinc-700")}>
                      {senderLabel(m)}
                    </p>
                    <span className="shrink-0 text-[10px] text-zinc-400">{messageDate(m)}</span>
                  </div>
                  <p className={cn("mail-subject mt-0.5 truncate text-sm", !m.isRead ? "font-bold" : "font-semibold")}>
                    {m.subject}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-zinc-400">
                    {m.isStarred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                    {m.hasAttachments && <Paperclip className="h-3 w-3" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Okuma paneli */}
        <section className="flex min-w-0 flex-1 flex-col">
          {!selectedMessage ? (
            <div className="flex flex-1 flex-col items-center justify-center text-zinc-400">
              <FileText className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">Okumak için bir mesaj seçin · geniş okuma için çift tıklayın</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
                <MailMessageActions
                  message={selectedMessage}
                  onReply={() => openCompose(selectedMessage)}
                  onReplyAll={() => openCompose(selectedMessage, true)}
                  onArchive={() => void archiveMessage(selectedMessage)}
                  onUnarchive={() => void unarchiveMessage(selectedMessage)}
                  onStar={() => void toggleStar(selectedMessage)}
                  onTrash={() => void moveToTrash(selectedMessage)}
                />
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <MailReaderBody message={selectedMessage} />
              </div>
            </>
          )}
        </section>
      </div>

      {/* Geniş okuma modalı */}
      {readerOpen && readerMessage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 sm:p-8"
          onClick={() => setReaderOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4">
              <p className="text-sm font-medium text-zinc-500">E-posta okuyucu</p>
              <div className="flex flex-wrap items-center gap-2">
                <MailMessageActions
                  message={readerMessage}
                  onReply={() => {
                    openCompose(readerMessage);
                    setReaderOpen(false);
                  }}
                  onReplyAll={() => {
                    openCompose(readerMessage, true);
                    setReaderOpen(false);
                  }}
                  onArchive={async () => {
                    if (await archiveMessage(readerMessage)) setReaderOpen(false);
                  }}
                  onUnarchive={async () => {
                    if (await unarchiveMessage(readerMessage)) setReaderOpen(false);
                  }}
                  onStar={() => void toggleStar(readerMessage)}
                  onTrash={() => void moveToTrash(readerMessage)}
                />
                <button
                  type="button"
                  onClick={() => setReaderOpen(false)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"
                  title="Kapat (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
              {readerLoading ? (
                <p className="text-center text-base text-zinc-400">Yükleniyor…</p>
              ) : (
                <MailReaderBody message={readerMessage} large />
              )}
            </div>
          </div>
        </div>
      )}

      {/* İmza düzenleyici */}
      {signatureOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="text-lg font-bold text-zinc-900">E-posta İmzası</h3>
              <button type="button" onClick={() => setSignatureOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-5">
              <Textarea
                label="Metin imza"
                value={signatureDraft}
                onChange={(e) => setSignatureDraft(e.target.value)}
                rows={6}
                placeholder={"Saygılarımla,\nOsman Yılmaz\nAsist On · Sigorta Asistans\ntel: 0xxx xxx xx xx"}
              />
              <Textarea
                label="HTML imza (isteğe bağlı)"
                value={signatureHtmlDraft}
                onChange={(e) => setSignatureHtmlDraft(e.target.value)}
                rows={4}
                placeholder='<p><strong>Asist On</strong><br/>Sigorta Asistans</p>'
              />
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Önizleme</p>
                {signatureHtmlDraft.trim() ? (
                  <div
                    className="prose prose-sm max-w-none text-zinc-800"
                    dangerouslySetInnerHTML={{ __html: signatureHtmlDraft }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700">
                    {signatureDraft.trim() || "İmza metni girilmedi."}
                  </pre>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                Yeni e-posta ve yanıtlarda imza otomatik eklenir. HTML tanımlıysa HTML sürümü kullanılır.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button variant="secondary" onClick={() => setSignatureOpen(false)}>İptal</Button>
              <Button variant="accent" onClick={() => void saveSignature()} disabled={signatureSaving}>
                {signatureSaving ? "Kaydediliyor…" : "İmzayı Kaydet"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="text-lg font-bold text-zinc-900">
                {replyTo ? (composeReplyAll ? "Tümünü Yanıtla" : "Yanıtla") : "Yeni E-posta"}
              </h3>
              <button type="button" onClick={() => setComposeOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-5">
              <Input label="Kime" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="ornek@firma.com, diger@firma.com" required />
              <Input label="Cc" value={composeCc} onChange={(e) => setComposeCc(e.target.value)} placeholder="İsteğe bağlı" />
              <Input label="Konu" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} required />
              <Textarea label="Mesaj" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={10} />
              {signatureText.trim() && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Otomatik imza (gönderimde eklenir)
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700">{signatureText.trim()}</pre>
                </div>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Ekler</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setComposeFiles(Array.from(e.target.files ?? []))}
                  className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
                />
                {composeFiles.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                    {composeFiles.map((f) => (
                      <li key={f.name}>{f.name} ({Math.round(f.size / 1024)} KB)</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button variant="secondary" onClick={() => setComposeOpen(false)}>İptal</Button>
              <Button variant="accent" onClick={() => void handleSend()} disabled={sending}>
                <Send className="h-4 w-4" /> {sending ? "Gönderiliyor…" : "Gönder"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
