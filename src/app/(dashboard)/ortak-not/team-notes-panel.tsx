"use client";
import { apiFetch } from "@/lib/api-client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Send, Users, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";

interface TeamNoteEntry {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
}

export function TeamNotesPanel() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<TeamNoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/team-notes");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotes(data as TeamNoteEntry[]);
        setError(null);
      } else {
        setError(typeof data.error === "string" ? data.error : "Notlar yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (loading) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes, loading]);

  const chronologicalNotes = [...notes].reverse();

  async function handleSend() {
    const content = draft.trim();
    if (!content) {
      setError("Not metni boş olamaz.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await apiFetch("/api/team-notes", {
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Toplantı Masası"
        description="Ekiple mesajlaşın — kim ne zaman yazdı sohbet akışında görünür"
        breadcrumb={["Ana Sayfa", "Toplantı Masası"]}
      />

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900">
        <Users className="h-4 w-4 shrink-0 text-indigo-600" />
        Mesajlar sohbet akışında listelenir. Enter ile gönderin, yeni satır için Shift+Enter kullanın.
      </div>

      <Card className="flex min-h-[560px] max-h-[calc(100vh-13rem)] flex-col overflow-hidden">
        <CardHeader
          title="Ekip Sohbeti"
          action={
            <span className="text-xs font-medium text-zinc-400">
              {notes.length} mesaj
            </span>
          }
        />

        <CardBody className="flex min-h-0 flex-1 flex-col p-0">
          {error && (
            <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(250,250,250,0.9)_0%,rgba(244,244,245,0.6)_100%)] px-4 py-5"
          >
            {loading ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-200" />
                  <div className="h-16 w-2/5 animate-pulse rounded-2xl bg-zinc-200" />
                </div>
                <div className="flex justify-end">
                  <div className="h-14 w-1/3 animate-pulse rounded-2xl bg-indigo-100" />
                </div>
              </div>
            ) : chronologicalNotes.length === 0 ? (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
                <MessageSquareText className="h-10 w-10 text-zinc-300" />
                <p className="text-sm font-medium text-zinc-500">Henüz mesaj yok</p>
                <p className="text-xs text-zinc-400">İlk notu alttaki alandan paylaşın.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chronologicalNotes.map((note) => {
                  const isOwn = note.author.id === currentUserId;

                  return (
                    <div
                      key={note.id}
                      className={cn("flex gap-2.5", isOwn ? "flex-row-reverse" : "flex-row")}
                    >
                      {!isOwn && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                          {note.author.name.charAt(0)}
                        </div>
                      )}

                      <div
                        className={cn(
                          "flex max-w-[min(75%,520px)] flex-col",
                          isOwn ? "items-end" : "items-start",
                        )}
                      >
                        {!isOwn && (
                          <p className="mb-1 px-1 text-xs font-semibold text-zinc-500">
                            {note.author.name}
                          </p>
                        )}

                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2.5 shadow-sm",
                            isOwn
                              ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                              : "rounded-bl-md border border-zinc-200/80 bg-white text-zinc-800",
                          )}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
                        </div>

                        <p
                          className={cn(
                            "mt-1 px-1 text-[11px] text-zinc-400",
                            isOwn && "text-right",
                          )}
                        >
                          {formatDateTime(note.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-zinc-100 bg-white p-4">
            <div className="flex items-end gap-3">
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Mesajınızı yazın…"
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
              <Button
                variant="accent"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sending}
                className="h-11 w-11 shrink-0 rounded-2xl p-0"
                aria-label="Mesaj gönder"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
