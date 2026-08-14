// Personal calendar events, plus the listing dates that appear alongside them.
//
// Ported from the previous site's /calendar page. Two kinds of thing share the
// grid:
//   • auto-derived entries from listing dates (supply available_until,
//     demand deadline) — read-only, coloured by type
//   • the user's own calendar_events rows — editable, user-picked colour
//
// Reminders are stored as an absolute `reminder_at` timestamp, which is what
// the send-calendar-reminders Edge Function reads.

import { supabase } from "./client"
import type { CalendarEventRow } from "./types"

export const SUPPLY_COLOR = "#B2D8A2"
export const DEMAND_COLOR = "#C0392B"
export const COLOR_SWATCHES = ["#4A6B4E", "#3B82F6", "#E3B341", "#C0392B", "#8B5CF6", "#EC4899"]

/** The only offsets the database's check constraint accepts. */
export type ReminderOffset = "sameDay" | "dayBefore" | "twoDaysBefore" | "custom"

export const REMINDER_CHOICES: { value: ReminderOffset | "none"; label: string }[] = [
  { value: "none", label: "בלי תזכורת" },
  { value: "sameDay", label: "אותו היום" },
  { value: "dayBefore", label: "יום לפני" },
  { value: "twoDaysBefore", label: "יומיים לפני" },
  { value: "custom", label: "תאריך ושעה מותאמים" },
]

/** YYYY-MM-DD in local time — toISOString() would shift across midnight. */
export function ymd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", { month: "long", year: "numeric" })
}

/** Calendar cells for a month, with leading nulls so day 1 lands on its weekday. */
export function monthCells(cursor: Date): (Date | null)[] {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  return cells
}

/**
 * Absolute send time for a reminder. Events are date-only, so day-level
 * offsets are combined with an explicit dispatch time.
 *
 * The picked time is what the contractor sees on their own clock, so it must
 * be anchored to their timezone before it becomes a timestamptz. Sending a
 * bare "09:00" makes Postgres read it as 09:00 UTC — which is midday in
 * Israel, so every reminder would fire hours late.
 */
function toUtcInstant(date: string, time: string): string {
  // No trailing Z: this form is parsed in the browser's local timezone.
  return new Date(`${date}T${time || "09:00"}:00`).toISOString()
}

export function computeReminderAt(
  eventDate: string,
  offset: ReminderOffset | "none",
  time: string,
  customDate?: string,
  customTime?: string,
): string | null {
  if (offset === "none") return null
  if (offset === "custom") {
    return customDate ? toUtcInstant(customDate, customTime || "09:00") : null
  }

  const base = new Date(`${eventDate}T00:00:00`)
  const daysBefore = { sameDay: 0, dayBefore: 1, twoDaysBefore: 2 }[offset]
  base.setDate(base.getDate() - daysBefore)
  return toUtcInstant(ymd(base), time)
}

/* -------------------------------------------------------------------------- */

/** Stored reminders are UTC instants; forms must show them on the local clock. */
export function localDateOf(iso: string): string {
  return ymd(new Date(iso))
}

export function localTimeOf(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export async function fetchCalendarEvents(
  userId: string,
): Promise<{ events: CalendarEventRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .order("event_date", { ascending: true })

  if (error) {
    console.error("fetchCalendarEvents failed", error)
    return { events: [], error: "טעינת היומן נכשלה. נסה שוב." }
  }
  return { events: data ?? [], error: null }
}

export type NewCalendarEvent = {
  userId: string
  title: string
  eventDate: string
  color: string
  category?: string | null
  reminderOffset: ReminderOffset | "none"
  reminderAt: string | null
}

export async function createCalendarEvent(
  input: NewCalendarEvent,
): Promise<{ event: CalendarEventRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: input.userId,
      title: input.title.trim(),
      event_date: input.eventDate,
      color: input.color,
      category: input.category?.trim() || null,
      reminder_offset: input.reminderOffset === "none" ? null : input.reminderOffset,
      reminder_at: input.reminderAt,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("createCalendarEvent failed", error)
    return { event: null, error: "שמירת האירוע נכשלה. נסה שוב." }
  }
  return { event: data, error: null }
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<{
    title: string
    event_date: string
    color: string
    category: string | null
    reminder_offset: ReminderOffset | null
    reminder_at: string | null
  }>,
): Promise<{ event: CalendarEventRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error || !data) {
    console.error("updateCalendarEvent failed", error)
    return { event: null, error: "עדכון האירוע נכשל. נסה שוב." }
  }
  return { event: data, error: null }
}

export async function deleteCalendarEvent(id: string): Promise<string | null> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id)
  if (error) {
    console.error("deleteCalendarEvent failed", error)
    return "מחיקת האירוע נכשלה. נסה שוב."
  }
  return null
}
