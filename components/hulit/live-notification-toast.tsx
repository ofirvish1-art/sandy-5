"use client"

// The live popup shown while someone is actually using the app: "<name>
// מעוניין במודעה שלך", the listing, and their contact details right there so
// the call can happen immediately.
//
// Only fires for interest in YOUR listings, and only while the site is open —
// delivery to a closed tab is web push, which is a separate piece of work.
//
// Every class here is taken from something already in the design: the card is
// the listing card's surface, the icon circle is the notifications sheet's,
// the call/WhatsApp buttons are ContactButtons', and the entrance animation is
// the bottom sheet's.

import { Inbox, Phone, MessageCircle, X } from "lucide-react"
import { useEffect } from "react"
import { type LiveToast, useNotifications } from "@/components/notifications-provider"
import { replyMessage, telLink, waLink } from "@/lib/supabase/contact"

/** Long enough to read a name and a number, short enough not to nag. */
const VISIBLE_MS = 9000

function ToastCard({ toast, onDismiss }: { toast: LiveToast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const tel = telLink(toast.contactPhone)
  const wa = waLink(toast.contactPhone, replyMessage(toast.detail))

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 pointer-events-auto w-full rounded-2xl bg-card p-4 text-right shadow-lg duration-300">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onDismiss}
          aria-label="סגור"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="size-4" />
        </button>

        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{toast.headline}</p>
            <p className="truncate text-xs text-muted-foreground">{toast.detail}</p>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft text-primary">
            <Inbox className="size-4" />
          </span>
        </div>
      </div>

      {toast.contactPhone ? (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <a
            href={tel ?? undefined}
            className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground"
            aria-label={`התקשר אל ${toast.contactName}`}
          >
            <Phone className="size-4" />
          </a>
          <a
            href={wa ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="flex size-10 items-center justify-center rounded-xl bg-success/15 text-success"
            aria-label={`שלח וואטסאפ אל ${toast.contactName}`}
          >
            <MessageCircle className="size-4" />
          </a>
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground" dir="ltr">
            {toast.contactPhone}
          </span>
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
          לא נמסרו פרטי קשר
        </p>
      )}
    </div>
  )
}

export function LiveNotificationToasts() {
  const { liveToasts, dismissToast } = useNotifications()
  if (liveToasts.length === 0) return null

  return (
    // Sits in the app column above the bottom nav, matching the existing toast's
    // placement. pointer-events-none on the stack so it never blocks the page.
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] mx-auto flex max-w-md flex-col gap-2 px-5">
      {liveToasts.slice(-3).map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  )
}
