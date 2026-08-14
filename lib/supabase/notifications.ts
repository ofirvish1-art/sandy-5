// What the header bell shows: who reached out about your listings, and which
// new listings match yours.
//
// Both come from data that already exists — interest_events for contacts, and
// the client-side matcher for matches — so nothing new is stored. "Unread" is
// kept in localStorage as a last-seen timestamp, which is enough for a badge
// without inventing a per-user notifications table.

import { supabase } from "./client"
import { formatRelativeTime } from "./listings"

export type ContactNotification = {
  id: string
  kind: "contact"
  channel: "call" | "whatsapp" | "interest"
  listingId: string
  listingMaterial: string
  viewerName: string
  createdAt: string
  relative: string
}

const LAST_SEEN_KEY = "sandit_notifications_last_seen"

export function getLastSeen(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(LAST_SEEN_KEY)
}

export function markAllSeen(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString())
}

/**
 * Interest events on listings owned by `userId`. Own taps are excluded — being
 * told you contacted yourself is noise.
 */
export async function fetchContactNotifications(
  userId: string,
  myListingIds: string[],
): Promise<{ items: ContactNotification[]; error: string | null }> {
  if (myListingIds.length === 0) return { items: [], error: null }

  const { data, error } = await supabase
    .from("interest_events")
    .select("id, channel, created_at, listing_id, viewer_user_id, listings(material_type), users(name)")
    .in("listing_id", myListingIds)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("fetchContactNotifications failed", error)
    return { items: [], error: "טעינת ההתראות נכשלה." }
  }

  type Row = {
    id: string
    channel: "call" | "whatsapp" | "interest"
    created_at: string
    listing_id: string
    viewer_user_id: string | null
    listings?: { material_type: string | null } | null
    users?: { name: string | null } | null
  }

  const items = (data as unknown as Row[])
    .filter((r) => r.viewer_user_id !== userId)
    .map((r) => ({
      id: r.id,
      kind: "contact" as const,
      channel: r.channel,
      listingId: r.listing_id,
      listingMaterial: r.listings?.material_type ?? "מודעה",
      viewerName: r.users?.name?.trim() || "משתמש סנדיט",
      createdAt: r.created_at,
      relative: formatRelativeTime(r.created_at),
    }))

  return { items, error: null }
}

export const CHANNEL_LABELS: Record<ContactNotification["channel"], string> = {
  interest: "סימן שהוא מעוניין",
  whatsapp: "פנה בוואטסאפ",
  call: "התקשר",
}
