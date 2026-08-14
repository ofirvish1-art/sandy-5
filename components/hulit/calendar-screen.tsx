"use client"

import { Bell, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useListings } from "@/components/listings-provider"
import {
  COLOR_SWATCHES,
  computeReminderAt,
  createCalendarEvent,
  DEMAND_COLOR,
  deleteCalendarEvent,
  fetchCalendarEvents,
  localDateOf,
  localTimeOf,
  monthCells,
  monthLabel,
  REMINDER_CHOICES,
  type ReminderOffset,
  SUPPLY_COLOR,
  updateCalendarEvent,
  ymd,
} from "@/lib/supabase/calendar"
import type { CalendarEventRow } from "@/lib/supabase/types"
import { BottomSheet } from "./bottom-sheet"

const WEEK_DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]

/** A listing date shown on the grid — read-only, derived from the listing. */
type DerivedEntry = {
  kind: "listing"
  id: string
  date: string
  color: string
  title: string
  subtitle: string
}

type OwnEntry = { kind: "event"; id: string; date: string; color: string; row: CalendarEventRow }

type Entry = DerivedEntry | OwnEntry

export function CalendarScreen({ onNotify }: { onNotify?: (msg: string) => void }) {
  const { profile } = useAuth()
  const { listings } = useListings()

  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => ymd(new Date()))
  const [events, setEvents] = useState<CalendarEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [dayOpen, setDayOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [color, setColor] = useState(COLOR_SWATCHES[0])
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset | "none">("none")
  const [reminderTime, setReminderTime] = useState("09:00")
  const [customDate, setCustomDate] = useState("")
  const [customTime, setCustomTime] = useState("09:00")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isEditing = editingId !== null

  const load = useCallback(async () => {
    if (!profile) return
    const result = await fetchCalendarEvents(profile.id)
    setEvents(result.events)
    setLoadError(result.error)
    setLoading(false)
  }, [profile])

  useEffect(() => {
    load()
  }, [load])

  // Listing dates land on the grid automatically: a supply's available_until
  // and a demand's deadline. Closed listings are dropped — the date no longer
  // means anything once the deal is done.
  const derived = useMemo<DerivedEntry[]>(() => {
    const out: DerivedEntry[] = []
    for (const l of listings) {
      if (l.status === "closed") continue
      const date = l.type === "supply" ? l.availableUntil : l.deadline
      if (!date) continue
      out.push({
        kind: "listing",
        id: `listing-${l.id}`,
        date,
        color: l.type === "supply" ? SUPPLY_COLOR : DEMAND_COLOR,
        title: `${l.material} · ${l.quantity} קוב`,
        subtitle: `${l.type === "supply" ? "היצע" : "ביקוש"} · ${l.city}`,
      })
    }
    return out
  }, [listings])

  const byDate = useMemo(() => {
    const map: Record<string, Entry[]> = {}
    for (const d of derived) (map[d.date] ||= []).push(d)
    for (const e of events) {
      ;(map[e.event_date] ||= []).push({
        kind: "event",
        id: e.id,
        date: e.event_date,
        color: e.color || COLOR_SWATCHES[0],
        row: e,
      })
    }
    return map
  }, [derived, events])

  const cells = useMemo(() => monthCells(cursor), [cursor])
  const selectedEntries = byDate[selectedDate] ?? []

  const upcoming = useMemo(() => {
    const today = ymd(new Date())
    return Object.entries(byDate)
      .filter(([date]) => date >= today)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([date, list]) => list.map((entry) => ({ date, entry })))
      .slice(0, 8)
  }, [byDate])

  function resetForm(date = selectedDate) {
    setEditingId(null)
    setTitle("")
    setCategory("")
    setColor(COLOR_SWATCHES[0])
    setReminderOffset("none")
    setReminderTime("09:00")
    setCustomDate(date)
    setCustomTime("09:00")
    setFormError(null)
  }

  function openCreate(date = selectedDate) {
    setSelectedDate(date)
    resetForm(date)
    setDayOpen(false)
    setAddOpen(true)
  }

  function openEdit(row: CalendarEventRow) {
    setEditingId(row.id)
    setSelectedDate(row.event_date)
    setTitle(row.title)
    setCategory(row.category ?? "")
    setColor(row.color || COLOR_SWATCHES[0])
    setReminderOffset((row.reminder_offset as ReminderOffset) ?? "none")
    setReminderTime(row.reminder_at ? localTimeOf(row.reminder_at) : "09:00")
    setCustomDate(row.reminder_at ? localDateOf(row.reminder_at) : row.event_date)
    setCustomTime(row.reminder_at ? localTimeOf(row.reminder_at) : "09:00")
    setFormError(null)
    setDayOpen(false)
    setAddOpen(true)
  }

  function closeModal() {
    setAddOpen(false)
    setTimeout(() => resetForm(), 300)
  }

  async function save() {
    if (!profile || !title.trim() || saving) return
    setSaving(true)
    setFormError(null)

    const reminderAt = computeReminderAt(
      selectedDate,
      reminderOffset,
      reminderTime,
      customDate,
      customTime,
    )

    if (reminderOffset === "custom" && !reminderAt) {
      setFormError("בחר תאריך לתזכורת המותאמת.")
      setSaving(false)
      return
    }

    if (isEditing) {
      const result = await updateCalendarEvent(editingId, {
        title: title.trim(),
        event_date: selectedDate,
        color,
        category: category.trim() || null,
        reminder_offset: reminderOffset === "none" ? null : reminderOffset,
        reminder_at: reminderAt,
      })
      setSaving(false)
      if (result.error || !result.event) {
        setFormError(result.error)
        return
      }
      setEvents((prev) => prev.map((e) => (e.id === result.event!.id ? result.event! : e)))
      onNotify?.("האירוע עודכן")
    } else {
      const result = await createCalendarEvent({
        userId: profile.id,
        title,
        eventDate: selectedDate,
        color,
        category,
        reminderOffset,
        reminderAt,
      })
      setSaving(false)
      if (result.error || !result.event) {
        setFormError(result.error)
        return
      }
      setEvents((prev) => [...prev, result.event!])
      onNotify?.(reminderAt ? "האירוע נשמר ותזכורת נקבעה" : "האירוע נשמר")
    }

    closeModal()
  }

  async function remove() {
    if (!editingId || saving) return
    setSaving(true)
    const error = await deleteCalendarEvent(editingId)
    setSaving(false)
    if (error) {
      setFormError(error)
      return
    }
    setEvents((prev) => prev.filter((e) => e.id !== editingId))
    onNotify?.("האירוע נמחק")
    closeModal()
  }

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  }

  return (
    <div className="space-y-5 px-5 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="size-4" /> הוספת אירוע
        </button>
        <h2 className="text-lg font-extrabold text-foreground">יומן</h2>
      </div>

      {loadError && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-bold text-destructive">
          {loadError}
        </p>
      )}

      <div className="rounded-3xl bg-card p-4 shadow-sm">
        {/* Month navigation — RTL, so "next" points left. */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="החודש הבא"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="text-base font-extrabold text-foreground">{monthLabel(cursor)}</p>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="החודש הקודם"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground">
          {WEEK_DAYS.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((date, idx) => {
            if (!date) return <div key={`pad-${idx}`} className="min-h-12" />
            const key = ymd(date)
            const entries = byDate[key] ?? []
            const isToday = key === ymd(new Date())
            const isSelected = key === selectedDate
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDate(key)
                  setDayOpen(true)
                }}
                className={`flex min-h-12 flex-col items-center rounded-xl p-1 text-xs transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "bg-sage-soft text-primary"
                      : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                <span className="font-bold">{date.getDate()}</span>
                <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {entries.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: e.color }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            היצע <span className="size-2.5 rounded-full" style={{ backgroundColor: SUPPLY_COLOR }} />
          </span>
          <span className="flex items-center gap-1.5">
            ביקוש <span className="size-2.5 rounded-full" style={{ backgroundColor: DEMAND_COLOR }} />
          </span>
          <span className="flex items-center gap-1.5">
            מותאם אישית <span className="size-2.5 rounded-full" style={{ backgroundColor: COLOR_SWATCHES[0] }} />
          </span>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-right text-base font-extrabold text-foreground">אירועים קרובים</h3>

        {loading && <p className="py-4 text-center text-sm text-muted-foreground">טוען יומן…</p>}

        {!loading && upcoming.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            אין אירועים קרובים. תאריכי המודעות שלך יופיעו כאן אוטומטית.
          </p>
        )}

        {upcoming.map(({ date, entry }) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => (entry.kind === "event" ? openEdit(entry.row) : setSelectedDate(date))}
            className="flex w-full items-center justify-between rounded-2xl bg-card p-3 text-right shadow-sm transition-colors hover:bg-accent"
          >
            <span className="shrink-0 text-sm font-bold text-muted-foreground">
              {date.slice(8, 10)}/{date.slice(5, 7)}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {entry.kind === "event" ? entry.row.title : entry.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.kind === "event" ? (entry.row.category ?? "אירוע אישי") : entry.subtitle}
                </p>
              </div>
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            </div>
          </button>
        ))}
      </section>

      {/* Day details */}
      <BottomSheet
        open={dayOpen}
        onClose={() => setDayOpen(false)}
        title={`אירועים ל-${selectedDate.slice(8, 10)}/${selectedDate.slice(5, 7)}`}
        footer={
          <button
            type="button"
            onClick={() => openCreate(selectedDate)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" /> הוספת אירוע ליום זה
          </button>
        }
      >
        <div className="space-y-2 text-right">
          {selectedEntries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">אין אירועים מתוכננים ליום זה.</p>
          ) : (
            selectedEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => entry.kind === "event" && openEdit(entry.row)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3.5 text-right ${
                  entry.kind === "event" ? "transition-colors hover:bg-muted" : "cursor-default"
                }`}
              >
                {entry.kind === "event" && entry.row.reminder_at && (
                  <Bell className="size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {entry.kind === "event" ? entry.row.title : entry.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.kind === "event"
                        ? (entry.row.category ?? "אירוע אישי")
                        : entry.subtitle}
                    </p>
                  </div>
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      {/* Create / edit */}
      <BottomSheet open={addOpen} onClose={closeModal} title={isEditing ? "עריכת אירוע" : "הוספת אירוע"}>
        <div className="space-y-4 text-right">
          <div>
            <label className="mb-1 block text-sm font-bold text-foreground">תאריך</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-foreground">תיאור</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: הגעת מהנדס לבדיקת קרקע"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-foreground">קטגוריה מותאמת</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="לדוגמה: עבודות אתר"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-foreground">צבע האירוע</label>
            <div className="flex flex-wrap justify-end gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`צבע ${c}`}
                  aria-pressed={color === c}
                  className={`size-8 rounded-full border-2 transition-transform ${
                    color === c ? "scale-110 border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-muted/60 p-3">
            <span className="flex items-center justify-end gap-1.5 text-sm font-bold text-foreground">
              תזכורת וואטסאפ <Bell className="size-4" />
            </span>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {REMINDER_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setReminderOffset(choice.value)}
                  aria-pressed={reminderOffset === choice.value}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    reminderOffset === choice.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>

            {(reminderOffset === "sameDay" ||
              reminderOffset === "dayBefore" ||
              reminderOffset === "twoDaysBefore") && (
              <div className="mt-2 flex items-center justify-between gap-3">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  aria-label="שעת שליחת התזכורת"
                />
                <label className="text-xs font-bold text-foreground">שעת שליחה</label>
              </div>
            )}

            {reminderOffset === "custom" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  aria-label="שעת התזכורת"
                />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                  aria-label="תאריך התזכורת"
                />
              </div>
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive">
              {formError}
            </p>
          )}

          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-destructive/30 px-4 py-3 text-sm font-bold text-destructive disabled:opacity-40"
              >
                <Trash2 className="size-4" /> מחק
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || !title.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "שומר…" : isEditing ? "שמור שינויים" : "שמור אירוע"}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
