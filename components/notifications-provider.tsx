"use client"

// Shared notification state: the header needs the unread count for its badge,
// the sheet needs the list, and the calendar reminder check needs to push new
// ones in. One fetch, one source of truth.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { fireDueReminders } from "@/lib/supabase/calendar"
import { supabase } from "@/lib/supabase/client"
import {
  type AppNotification,
  decorate,
  fetchActorContact,
  fetchNotifications,
  markAllRead,
  type NotificationRow,
} from "@/lib/supabase/notifications"

/** A notification that arrived while the user was looking at the app. */
export type LiveToast = {
  id: string
  headline: string
  detail: string
  contactName: string
  contactPhone: string
  listingId: string | null
}

type NotificationsState = {
  items: AppNotification[]
  unreadCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Called when the sheet opens — clears the badge. */
  markRead: () => Promise<void>
  /** Toasts waiting to be shown, oldest first. */
  liveToasts: LiveToast[]
  dismissToast: (id: string) => void
}

const NotificationsContext = createContext<NotificationsState | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const userId = profile?.id ?? null

  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    const result = await fetchNotifications(userId)
    setItems(result.items)
    setError(result.error)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Catch up on due reminders on open, then keep checking while the app stays
  // open so a reminder that comes due mid-session still lands.
  useEffect(() => {
    if (!userId) return

    const check = async () => {
      const fired = await fireDueReminders(userId)
      // Deliberately not gated on an "is still mounted" flag. Under React's
      // dev double-mount, the first pass claims the reminder and is then torn
      // down, so gating here would drop the only refresh that had anything to
      // show. Refreshing is idempotent, so the worst case is a wasted fetch.
      if (fired > 0) refresh()
    }

    check()
    const timer = setInterval(check, 60_000)
    return () => clearInterval(timer)
  }, [userId, refresh])

  const [liveToasts, setLiveToasts] = useState<LiveToast[]>([])

  const dismissToast = useCallback((id: string) => {
    setLiveToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Live delivery while the app is open. Realtime only sends rows this user
  // could have SELECTed, so the RLS policy from migration 014 still applies.
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as NotificationRow
          // Only somebody acting on *my* listing warrants interrupting me.
          if (row.type !== "interest_received") {
            refresh()
            return
          }

          const decorated = decorate(row)
          const contact = row.actor_user_id ? await fetchActorContact(row.actor_user_id) : null

          setLiveToasts((prev) => [
            ...prev,
            {
              id: row.id,
              headline: decorated.headline,
              detail: decorated.detail,
              contactName: contact?.name || (row.body ?? ""),
              contactPhone: contact?.phone ?? "",
              listingId: row.listing_id,
            },
          ])
          refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  const markRead = useCallback(async () => {
    if (!userId) return
    const changed = await markAllRead(userId)
    if (changed === 0) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
  }, [userId])

  const unreadCount = useMemo(() => items.filter((n) => !n.read_at).length, [items])

  const value = useMemo<NotificationsState>(
    () => ({ items, unreadCount, loading, error, refresh, markRead, liveToasts, dismissToast }),
    [items, unreadCount, loading, error, refresh, markRead, liveToasts, dismissToast],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>")
  return ctx
}
