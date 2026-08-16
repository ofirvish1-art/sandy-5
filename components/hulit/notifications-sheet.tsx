"use client"

import { BellRing, Inbox, Send, Sparkles } from "lucide-react"
import { useEffect } from "react"
import { useListings } from "@/components/listings-provider"
import { useNotifications } from "@/components/notifications-provider"
import type { NotificationType } from "@/lib/supabase/notifications"
import { BottomSheet } from "./bottom-sheet"
import type { Listing } from "./data"

const TYPE_ICONS: Record<NotificationType, typeof Send> = {
  interest_received: Inbox,
  interest_sent: Send,
  calendar_reminder: BellRing,
}

export function NotificationsSheet({
  open,
  onClose,
  onOpenListing,
}: {
  open: boolean
  onClose: () => void
  onOpenListing?: (l: Listing) => void
}) {
  const { listings, opportunities } = useListings()
  const { items, loading, error, refresh, markRead } = useNotifications()

  // Opening the panel is what counts as "seen" — refresh first so anything
  // that arrived while the sheet was shut is included before clearing.
  useEffect(() => {
    if (!open) return
    let active = true
    refresh().then(() => {
      if (active) markRead()
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const isEmpty = !loading && items.length === 0 && opportunities.length === 0

  return (
    <BottomSheet open={open} onClose={onClose} title="התראות">
      <div className="space-y-5 text-right">
        {loading && <p className="py-6 text-center text-sm text-muted-foreground">טוען התראות…</p>}

        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-bold text-destructive">
            {error}
          </p>
        )}

        {isEmpty && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            אין התראות חדשות. פניות למודעות שלך והתאמות חדשות יופיעו כאן.
          </p>
        )}

        {items.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-sm font-extrabold text-foreground">עדכונים</h4>
            {items.map((n) => {
              const Icon = TYPE_ICONS[n.type]
              const listing = n.listing_id ? listings.find((l) => l.id === n.listing_id) : undefined
              const clickable = Boolean(listing)

              const inner = (
                <>
                  <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{n.relative}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{n.headline}</p>
                      <p className="truncate text-xs text-muted-foreground">{n.detail}</p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft text-primary">
                      <Icon className="size-4" />
                    </span>
                  </div>
                </>
              )

              // Unread rows carry the same sage accent used elsewhere for "new".
              const base = `flex w-full items-center justify-between gap-3 rounded-2xl p-3.5 text-right ${
                n.read_at ? "bg-muted/60" : "bg-sage-soft"
              }`

              return clickable ? (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenListing?.(listing as Listing)
                  }}
                  className={`${base} transition-colors hover:bg-muted`}
                >
                  {inner}
                </button>
              ) : (
                <div key={n.id} className={base}>
                  {inner}
                </div>
              )
            })}
          </section>
        )}

        {opportunities.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-sm font-extrabold text-foreground">התאמות חדשות</h4>
            {opportunities.slice(0, 10).map((m) => (
              <button
                key={m.listing.id}
                type="button"
                onClick={() => {
                  onClose()
                  onOpenListing?.(m.listing)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3.5 text-right transition-colors hover:bg-muted"
              >
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    m.band === "high"
                      ? "bg-success/15 text-success"
                      : m.band === "medium"
                        ? "bg-warning/20 text-[oklch(0.45_0.1_85)]"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.percent}%
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {m.listing.material} · {m.listing.quantity} קוב
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.listing.city} · {m.listing.ownerName}
                    </p>
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft text-primary">
                    <Sparkles className="size-4" />
                  </span>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </BottomSheet>
  )
}
