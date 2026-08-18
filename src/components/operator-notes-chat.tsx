"use client";
import { apiFetch } from "@/lib/api-client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquareText, Send } from "lucide-react";
import { Button } from "@/components/button";
import { cn, formatDateTime } from "@/lib/utils";

export interface OperatorNoteEntry {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
}

const EMPTY_OPERATOR_NOTES: OperatorNoteEntry[] = [];

interface OperatorNotesChatProps {
  workOrderId?: string;
  initialNotes?: OperatorNoteEntry[];
  draft?: string;
  onDraftChange?: (value: string) => void;
  compact?: boolean;
  canWrite?: boolean;
  onNotesChange?: (notes: OperatorNoteEntry[]) => void;
}

export function OperatorNotesChat({
  workOrderId,
  initialNotes = EMPTY_OPERATOR_NOTES,
  draft = "",
  onDraftChange,
  compact = false,
  canWrite = true,
  onNotesChange,
}: OperatorNotesChatProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name ?? "Siz";

  const [notes, setNotes] = useState<OperatorNoteEntry[]>(initialNotes);
  const [localDraft, setLocalDraft] = useState(draft);
  const [loading, setLoading] = useState(Boolean(workOrderId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const controlledDraft = onDraftChange ? draft : localDraft;
  const setDraft = onDraftChange ?? setLocalDraft;

  const loadNotes = useCallback(async () => {
    if (!workOrderId) return;

    setLoading(true);
    try {
      const res = await apiFetch(`/api/work-orders/${workOrderId}/operator-notes`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const loaded = data as OperatorNoteEntry[];
        setNotes(loaded);
        onNotesChange?.(loaded);
        setError(null);
      } else {
        setError(typeof data.error === "string" ? data.error : "Operatör notları yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  }, [workOrderId, onNotesChange]);

  useEffect(() => {
    if (workOrderId) {
      void loadNotes();
      return;
    }
    if (initialNotes.length > 0) {
      setNotes(initialNotes);
    }
  }, [workOrderId, loadNotes, initialNotes]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes, controlledDraft, loading]);

  const chronologicalNotes = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const pendingPreview =
    !workOrderId && controlledDraft.trim()
      ? {
          id: "draft-preview",
          content: controlledDraft.trim(),
          createdAt: new Date().toISOString(),
          author: { id: currentUserId ?? "current", name: currentUserName },
        }
      : null;

  async function handleSend() {
    const content = controlledDraft.trim();
    if (!content) {
      setError("Not metni boş olamaz.");
      return;
    }

    if (!workOrderId) return;

    setSending(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/work-orders/${workOrderId}/operator-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Not gönderilemedi.");
        return;
      }

      setDraft("");
      await loadNotes();
    } catch {
      setError("Not gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!workOrderId) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const showInput = canWrite && (workOrderId ? true : Boolean(onDraftChange || !workOrderId));

  return (
    <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3")}>
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-indigo-600" />
        <p className={cn("font-semibold text-zinc-900", compact ? "text-sm" : "text-base")}>
          Operatör Notu
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div
        className={cn(
          "overflow-y-auto rounded-2xl border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(250,250,250,0.95)_0%,rgba(244,244,245,0.7)_100%)]",
          compact ? "max-h-44 px-3 py-3" : "max-h-72 px-4 py-4"
        )}
      >
        {loading ? (
          <div className="space-y-3">
            <div className="h-12 w-2/5 animate-pulse rounded-2xl bg-zinc-200" />
            <div className="ml-auto h-10 w-1/3 animate-pulse rounded-2xl bg-indigo-100" />
          </div>
        ) : chronologicalNotes.length === 0 && !pendingPreview ? (
          <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-6" : "py-10")}>
            <MessageSquareText className="h-8 w-8 text-zinc-300" />
            <p className="mt-2 text-sm font-medium text-zinc-500">Henüz operatör notu yok</p>
            <p className="text-xs text-zinc-400">İlk notu alttaki alandan ekleyin.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chronologicalNotes.map((note) => (
              <NoteBubble key={note.id} note={note} currentUserId={currentUserId} compact={compact} />
            ))}
            {pendingPreview && (
              <NoteBubble note={pendingPreview} currentUserId={currentUserId} compact={compact} pending />
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {showInput && (
        <div className="flex items-end gap-2">
          <textarea
            value={controlledDraft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            rows={compact ? 2 : 3}
            placeholder="Operatör notunuzu yazın…"
            className={cn(
              "flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10",
              compact && "min-h-[52px]"
            )}
          />
          {workOrderId ? (
            <Button
              variant="accent"
              onClick={() => void handleSend()}
              disabled={!controlledDraft.trim() || sending}
              className={cn("shrink-0 rounded-2xl p-0", compact ? "h-10 w-10" : "h-11 w-11")}
              aria-label="Not gönder"
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      )}

      {!workOrderId && canWrite && (
        <p className="text-[11px] text-zinc-400">
          Kayıt oluşturulduğunda notunuz <span className="font-medium text-zinc-500">{currentUserName}</span>{" "}
          adıyla kaydedilir.
        </p>
      )}
    </div>
  );
}

function NoteBubble({
  note,
  currentUserId,
  compact,
  pending = false,
}: {
  note: OperatorNoteEntry;
  currentUserId?: string;
  compact?: boolean;
  pending?: boolean;
}) {
  const isOwn = note.author.id === currentUserId;

  return (
    <div className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
      {!isOwn && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white",
            compact ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs"
          )}
        >
          {note.author.name.charAt(0)}
        </div>
      )}

      <div className={cn("flex max-w-[85%] flex-col", isOwn ? "items-end" : "items-start")}>
        <p className={cn("mb-1 px-1 font-semibold text-zinc-500", compact ? "text-[10px]" : "text-xs")}>
          {note.author.name}
          {pending ? " · gönderilecek" : ""}
        </p>

        <div
          className={cn(
            "rounded-2xl px-3 py-2 shadow-sm",
            compact ? "text-sm" : "text-sm",
            isOwn
              ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
              : "rounded-bl-md border border-zinc-200/80 bg-white text-zinc-800",
            pending && "opacity-80"
          )}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{note.content}</p>
        </div>

        {!pending && (
          <p className={cn("mt-1 px-1 text-zinc-400", compact ? "text-[10px]" : "text-[11px]", isOwn && "text-right")}>
            {formatDateTime(note.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}
