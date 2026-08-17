// The in-app notification centre.
//
// Rows come from public.notifications (migration 014). RLS already restricts
// them to the signed-in user, so these queries don't re-filter for security —
// only for clarity.
//
// The database stores facts, not sentences: `title` is the listing material,
// `body` is the other party's name. The Hebrew wording is composed here, for
// the same reason as migration 012 — Hebrew literals don't survive a paste
// into the SQL editor, and wording is presentation anyway.

import { supabase } from "./client"
import { formatRelativeTime } from "./listings"

export type NotificationType = "interest_received" | "interest_sent" | "calendar_reminder"

export type NotificationRow = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  listing_id: string | null
  calendar_event_id: string | null
  actor_user_id: string | null
  read_at: string | null
  created_at: string
}

export type AppNotification = NotificationRow & {
  /** Composed headline, e.g. "אבי הובלות מעוניין במודעה שלך". */
  headline: string
  /** Secondary line, usually the listing material. */
  detail: string
  relative: string
}

function compose(row: NotificationRow): { headline: string; detail: string } {
  const other = (row.body ?? "").trim() || "משתמש סנדיט"
  const subject = (row.title ?? "").trim()

  switch (row.type) {
    case "interest_received":
      return { headline: `${other} מעוניין במודעה שלך`, detail: subject }
    case "interest_sent":
      return { headline: `סימנת עניין במודעה של ${other}`, detail: subject }
    case "calendar_reminder":
      return { headline: "תזכורת מהיומן", detail: subject }
  }
}

export function decorate(row: NotificationRow): AppNotification {
  const { headline, detail } = compose(row)
  return { ...row, headline, detail, relative: formatRelativeTime(row.created_at) }
}

export async function fetchNotifications(
  userId: string,
): Promise<{ items: AppNotification[]; error: string | null }> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60)

  if (error) {
    console.error("fetchNotifications failed", error)
    return { items: [], error: "טעינת ההתראות נכשלה." }
  }
  return { items: (data as unknown as NotificationRow[]).map(decorate), error: null }
}

/**
 * The interested party's contact details, for the live toast.
 *
 * The notification row already carries their name and the listing material;
 * only the phone needs looking up, and only when a toast is actually shown.
 */
export async function fetchActorContact(
  actorUserId: string,
): Promise<{ name: string; phone: string } | null> {
  const { data, error } = await supabase
    .from("users")
    .select("name, phone")
    .eq("id", actorUserId)
    .maybeSingle()

  if (error || !data) {
    console.error("fetchActorContact failed", error)
    return null
  }
  return { name: data.name ?? "", phone: data.phone ?? "" }
}

/** Marks everything currently unread as read. Returns how many changed. */
export async function markAllRead(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)
    .select("id")

  if (error) {
    console.error("markAllRead failed", error)
    return 0
  }
  return data?.length ?? 0
}
