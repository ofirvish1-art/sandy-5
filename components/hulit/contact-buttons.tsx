"use client"

// Call + WhatsApp, shared by the listing card and the detail sheet so the two
// can't drift apart. Both log the tap to interest_events before opening.

import { Check, Loader2, MessageCircle, Phone, Send } from "lucide-react"
import { useState } from "react"
import { useCurrentUserId } from "@/components/auth-provider"
import { contactMessage, logInterest, telLink, waLink } from "@/lib/supabase/contact"
import type { Listing } from "./data"

export function ContactButtons({ listing, size = "md" }: { listing: Listing; size?: "sm" | "md" }) {
  const viewerId = useCurrentUserId()

  const phone = listing.contactPhone ?? ""
  const tel = telLink(phone)
  const wa = waLink(phone, contactMessage(listing.material, listing.quantity))
  const box = size === "sm" ? "size-10" : "size-11"
  const icon = size === "sm" ? "size-4" : "size-5"

  // A listing with no usable phone gets visibly disabled controls rather than
  // links that go nowhere.
  if (!tel || !wa) {
    return (
      <span className="text-xs font-semibold text-muted-foreground">לא נמסרו פרטי קשר למודעה זו</span>
    )
  }

  return (
    <>
      <a
        href={tel}
        onClick={() => logInterest(listing.id, viewerId, "call")}
        className={`flex ${box} items-center justify-center rounded-xl bg-muted text-foreground`}
        aria-label={`התקשר אל ${listing.ownerName}`}
      >
        <Phone className={icon} />
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        onClick={() => logInterest(listing.id, viewerId, "whatsapp")}
        className={`flex ${box} items-center justify-center rounded-xl bg-success/15 text-success`}
        aria-label={`שלח וואטסאפ אל ${listing.ownerName}`}
      >
        <MessageCircle className={icon} />
      </a>
    </>
  )
}

/**
 * The quiet interest flag: tells the owner someone is interested without
 * making the viewer start a call or a chat first. The database trigger added
 * in migration 010 turns this row into a notification attempt.
 */
export function InterestButton({ listing }: { listing: Listing }) {
  const viewerId = useCurrentUserId()
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState<string | null>(null)

  async function express() {
    if (state !== "idle") return
    setState("sending")
    setError(null)

    const result = await logInterest(listing.id, viewerId, "interest")
    if (!result.ok) {
      setError(result.error)
      setState("idle")
      return
    }
    setState("sent")
  }

  if (state === "sent") {
    return (
      <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success/15 py-3 text-sm font-bold text-success">
        <Check className="size-4" /> בעל המודעה יקבל התראה
      </span>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button"
        onClick={express}
        disabled={state === "sending"}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        אני מעוניין
      </button>
      {error && (
        <span role="alert" className="text-center text-[11px] font-bold text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
