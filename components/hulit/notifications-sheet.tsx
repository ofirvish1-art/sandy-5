"use client"

import { MessageCircle, Phone, Send, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useListings } from "@/components/listings-provider"
import {
  CHANNEL_LABELS,
  type ContactNotification,
  fetchContactNotifications,
  markAllSeen,
} from "@/lib/supabase/notifications"
import { BottomSheet } from "./bottom-sheet"
import type { Listing } from "./data"

const CHANNEL_ICONS = {
  interest: Send,
  whatsapp: MessageCircle,
  call: Phone,
} as const

export function NotificationsSheet({
  open,
  onClose,
  onOpenListing,
}: {
  open: boolean
  onClose: () => void
  onOpenListing?: (l: Listing) => void
}) {
  const { profile } = useAuth()
  const { listings, opportunities } = useListings()
  const [contacts, setContacts] = useState<ContactNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const myListingIds = listings.filter((l) => l.owner === "me").map((l) => l.id)

  useEffect(() => {
    if (!open || !profile) return
    let active = true
    setLoading(true)
    fetchContactNotifications(profile.id, myListingIds).then((result) => {
      if (!active) return
      setContacts(result.items)
      setError(result.error)
      setLoading(false)
      markAllSeen()
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile, myListingIds.join(",")])

  const isEmpty = !loading && contacts.length === 0 && opportunities.length === 0

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

        {contacts.length > 0 && (
          <section className="space-y-2">
            <h4 className="text-sm font-extrabold text-foreground">פניות למודעות שלך</h4>
            {contacts.map((n) => {
              const Icon = CHANNEL_ICONS[n.channel]
              return (
                <div
                  key={n.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3.5 text-right"
                >
                  <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{n.relative}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {n.viewerName} {CHANNEL_LABELS[n.channel]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{n.listingMaterial}</p>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft text-primary">
                      <Icon className="size-4" />
                    </span>
                  </div>
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
