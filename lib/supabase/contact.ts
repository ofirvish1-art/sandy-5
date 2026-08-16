// Quick-contact: call + WhatsApp, and the interest log behind them.
//
// Every tap inserts a row into `interest_events`. A Supabase Database Webhook
// on INSERT is meant to call the notify-on-interest Edge Function, which
// WhatsApps the listing owner that someone is interested.
//
// NOTE: all 11 existing interest_events rows have notified = false, so that
// webhook has never actually fired in this project. Logging still happens —
// it's the record of who contacted whom — but do not assume the owner was
// messaged. See supabase/GAPS.md.

import { BRAND } from "@/components/hulit/data"
import { supabase } from "./client"

// 'interest' is the quiet flag — the owner is notified without the viewer
// having to start a call or a chat. Allowed by migration 010; before that the
// check constraint rejected it, which is why no such rows exist.
export type InterestChannel = "call" | "whatsapp" | "interest"

/**
 * Israeli mobile numbers are stored as typed ("0501234567"). WhatsApp needs
 * them in international form without a plus.
 */
export function toInternational(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("972")) return digits
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits
}

export function telLink(phone: string): string | null {
  const digits = (phone || "").replace(/\D/g, "")
  return digits ? `tel:${digits}` : null
}

export function waLink(phone: string, text: string): string | null {
  const intl = toInternational(phone)
  return intl ? `https://wa.me/${intl}?text=${encodeURIComponent(text)}` : null
}

/** The prefilled opener, so the owner immediately knows which ad this is about. */
export function contactMessage(material: string, quantityCubic: number): string {
  return `שלום, ראיתי את הפרסום שלך (${material}, ${quantityCubic} קו״ב) ב${BRAND.he} ורציתי לבדוק זמינות.`
}

/**
 * The other direction: the listing OWNER getting back to someone who showed
 * interest. Same idea, opposite point of view.
 */
export function replyMessage(material: string): string {
  return `שלום, ראיתי שהתעניינת במודעה שלי (${material}) ב${BRAND.he}. אפשר לתאם?`
}

/**
 * Fire-and-forget: a failure here must never stop the call or WhatsApp from
 * opening. The user's intent is to make contact, not to write a log row.
 */
export async function logInterest(
  listingId: string,
  viewerUserId: string | null,
  channel: InterestChannel,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from("interest_events").insert({
      listing_id: listingId,
      viewer_user_id: viewerUserId,
      channel,
    })
    if (error) {
      console.error("could not log interest event", error)
      // 23514 = check constraint violation, i.e. migration 010 hasn't run.
      if (error.code === "23514") {
        return { ok: false, error: "יש להריץ את migration_010_interest_notifications.sql." }
      }
      return { ok: false, error: "לא הצלחנו לרשום את הפנייה. נסה שוב." }
    }
    return { ok: true, error: null }
  } catch (e) {
    console.error("could not log interest event", e)
    return { ok: false, error: "לא הצלחנו לרשום את הפנייה. נסה שוב." }
  }
}
