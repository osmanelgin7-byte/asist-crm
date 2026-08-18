"use client";
import { apiFetch } from "@/lib/api-client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { tr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Input, Textarea } from "@/components/form-fields";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlannerEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  color: string;
}

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const COLOR_OPTIONS = [
  { value: "indigo", className: "bg-indigo-500" },
  { value: "violet", className: "bg-violet-500" },
  { value: "emerald", className: "bg-emerald-500" },
  { value: "amber", className: "bg-amber-500" },
  { value: "rose", className: "bg-rose-500" },
  { value: "sky", className: "bg-sky-500" },
] as const;

const COLOR_BADGE: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  violet: "bg-violet-100 text-violet-800 ring-violet-200",
  emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  rose: "bg-rose-100 text-rose-800 ring-rose-200",
  sky: "bg-sky-100 text-sky-800 ring-sky-200",
};

function toDateInput(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function toTimeInput(date: Date) {
  return format(date, "HH:mm");
}

function combineDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function formatEventTime(event: PlannerEvent) {
  const start = new Date(event.startAt);
  if (event.allDay) return "Tüm gün";
  const startText = format(start, "HH:mm", { locale: tr });
  if (!event.endAt) return startText;
  return `${startText} – ${format(new Date(event.endAt), "HH:mm", { locale: tr })}`;
}

export function PlannerPanel() {
  const { data: session } = useSession();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("indigo");

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString();
      const to = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }).toISOString();
      const res = await apiFetch(`/api/planner/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const data = await res.json();
      if (res.ok) setEvents(data as PlannerEvent[]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventsForDay = useMemo(
    () => events.filter((event) => isSameDay(new Date(event.startAt), selectedDay)),
    [events, selectedDay]
  );

  function eventsOnDay(day: Date) {
    return events.filter((event) => isSameDay(new Date(event.startAt), day));
  }

  function resetForm(day = selectedDay) {
    setTitle("");
    setDescription("");
    setDate(toDateInput(day));
    setStartTime("09:00");
    setEndTime("10:00");
    setAllDay(false);
    setColor("indigo");
    setFormError(null);
    setEditingEvent(null);
  }

  function openCreateModal(day?: Date) {
    const target = day ?? selectedDay;
    setSelectedDay(target);
    resetForm(target);
    setModalOpen(true);
  }

  function openEditModal(event: PlannerEvent) {
    const start = new Date(event.startAt);
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description ?? "");
    setDate(toDateInput(start));
    setStartTime(toTimeInput(start));
    setEndTime(event.endAt ? toTimeInput(new Date(event.endAt)) : toTimeInput(start));
    setAllDay(event.allDay);
    setColor(event.color);
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const startAt = allDay
        ? new Date(`${date}T00:00:00`).toISOString()
        : combineDateTime(date, startTime).toISOString();
      const endAt = allDay
        ? null
        : combineDateTime(date, endTime).toISOString();

      const payload = {
        title,
        description,
        startAt,
        endAt,
        allDay,
        color,
      };

      const res = await apiFetch(
        editingEvent ? `/api/planner/events/${editingEvent.id}` : "/api/planner/events",
        {
          method: editingEvent ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(typeof data.error === "string" ? data.error : "Kayıt başarısız.");
        return;
      }

      closeModal();
      await loadEvents();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(event: PlannerEvent) {
    if (!confirm(`"${event.title}" kaydını silmek istediğinize emin misiniz?`)) return;

    const res = await apiFetch(`/api/planner/events/${event.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Kayıt silinemedi.");
      return;
    }
    await loadEvents();
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Planlayıcı"
        description={
          session?.user?.name
            ? `${session.user.name} — kişisel iş takviminiz`
            : "Kişisel iş takviminiz"
        }
        breadcrumb={["Ana Sayfa", "Planlayıcı"]}
        action={
          <Button variant="accent" onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4" /> Etkinlik Ekle
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title={format(currentMonth, "MMMM yyyy", { locale: tr })}
            action={
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  aria-label="Önceki ay"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(startOfMonth(today));
                    setSelectedDay(today);
                  }}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                >
                  Bugün
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                  aria-label="Sonraki ay"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            }
          />
          <CardBody>
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayEvents = eventsOnDay(day);
                const selected = isSameDay(day, selectedDay);
                const inMonth = isSameMonth(day, currentMonth);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    onDoubleClick={() => openCreateModal(day)}
                    className={cn(
                      "min-h-[88px] rounded-2xl border p-2 text-left transition-all",
                      selected
                        ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500/20"
                        : "border-transparent hover:border-zinc-200 hover:bg-zinc-50/80",
                      !inMonth && "opacity-40"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                        isToday(day) && "bg-indigo-600 text-white",
                        !isToday(day) && selected && "text-indigo-700",
                        !isToday(day) && !selected && "text-zinc-700"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                            COLOR_BADGE[event.color] ?? COLOR_BADGE.indigo
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[10px] font-medium text-zinc-400">+{dayEvents.length - 2} daha</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {loading && <p className="mt-4 text-center text-xs text-zinc-400">Takvim yükleniyor…</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={format(selectedDay, "d MMMM yyyy", { locale: tr })}
            action={
              <button
                type="button"
                onClick={() => openCreateModal(selectedDay)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                + Ekle
              </button>
            }
          />
          <CardBody className="space-y-3">
            {eventsForDay.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">Bu gün için kayıt yok.</p>
            ) : (
              eventsForDay.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 ring-1 ring-zinc-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                          COLOR_BADGE[event.color] ?? COLOR_BADGE.indigo
                        )}
                      >
                        {formatEventTime(event)}
                      </span>
                      <p className="mt-2 font-semibold text-zinc-900">{event.title}</p>
                      {event.description && (
                        <p className="mt-1 text-sm text-zinc-500">{event.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(event)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-indigo-600"
                        title="Düzenle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(event)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white hover:text-rose-600"
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingEvent ? "Etkinliği Düzenle" : "Yeni Etkinlik"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <Input label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <Textarea
            label="Açıklama"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Opsiyonel notlar…"
          />

          <Input label="Tarih" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            Tüm gün
          </label>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Başlangıç" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              <Input label="Bitiş" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700">Renk</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "h-8 w-8 rounded-full ring-2 ring-offset-2 transition-all",
                    option.className,
                    color === option.value ? "ring-indigo-400 scale-110" : "ring-transparent"
                  )}
                  aria-label={option.value}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              İptal
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitting ? "Kaydediliyor…" : editingEvent ? "Kaydet" : "Ekle"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
