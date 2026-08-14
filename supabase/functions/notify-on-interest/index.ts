// supabase/functions/notify-on-interest/index.ts
//
// Notifies a listing owner that someone tapped "אני מעוניין", called, or
// opened WhatsApp on their listing.
//
// Invoked by the `interest_events_notify` database trigger created in
// migration_010_interest_notifications.sql — not by a dashboard-configured
// Database Webhook. The trigger is in version control and applies with the
// migration, so it cannot go silently missing the way the old webhook did.
//
// PROVIDER-AGNOSTIC BY DESIGN. The previous version was hardwired to Twilio;
// that account is closed. This one sends a generic HTTPS request described
// entirely by environment variables, so swapping provider is a secrets change
// and not a code change.
//
//   WHATSAPP_PROVIDER   free-text label recorded on the attempt, e.g. "meta"
//   WHATSAPP_API_URL    endpoint to POST to
//   WHATSAPP_API_TOKEN  bearer token
//   WHATSAPP_FROM       sender id, if the provider needs one
//   WHATSAPP_TEMPLATE   optional: "json" body shape override (see buildBody)
//
// With no provider configured the function still runs and still records the
// attempt — as 'skipped', with the reason — so the pipeline is verifiable
// before any provider exists.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

type TriggerPayload = {
  attempt_id?: string
  interest_event_id?: string
  listing_id?: string
  recipient_user_id?: string
  recipient_phone?: string
  source_channel?: string
  /** Structured facts from the trigger. Wording is composed here, not in SQL. */
  payload?: {
    material?: string
    quantity?: number | string
    location?: string
    owner_name?: string
  }
}

/**
 * The message is built here rather than in the database trigger: Hebrew
 * literals do not reliably survive being pasted into a SQL editor, and
 * wording is presentation anyway. See migration_012_notification_payload.sql.
 */
function composeMessage(p: NonNullable<TriggerPayload["payload"]>): string {
  const name = (p.owner_name ?? "").trim() || "קבלן"
  const material = (p.material ?? "").trim()
  const quantity = p.quantity != null ? String(p.quantity) : ""
  const where = (p.location ?? "").trim()

  const details = [material, quantity ? `${quantity} קו״ב` : ""].filter(Boolean).join(", ")
  const place = where ? ` ב${where}` : ""

  return `שלום ${name}, מישהו התעניין במודעה שלך בסנדיט: ${details}${place}.`
}

/** Israeli local numbers to international, no plus. */
function toInternational(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("972")) return digits
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits
}

/**
 * Most WhatsApp Business APIs accept a shape close to Meta Cloud API's.
 * If yours differs, change this one function — nothing else needs to move.
 */
function buildBody(to: string, message: string, from: string): Record<string, unknown> {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: message },
    ...(from ? { from } : {}),
  }
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  let payload: TriggerPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const attemptId = payload.attempt_id
  const phone = toInternational(payload.recipient_phone ?? "")
  const message = payload.payload ? composeMessage(payload.payload) : ""

  // Records the outcome against the attempt row the trigger already created,
  // including the exact text we composed, so it is auditable after the fact.
  async function finish(status: "sent" | "failed" | "skipped", provider: string | null, error?: string) {
    if (attemptId) {
      const { error: updateError } = await supabase
        .from("notification_attempts")
        .update({
          status,
          provider,
          error: error ?? null,
          message: message || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attemptId)
      if (updateError) console.error("could not update notification_attempts", updateError)
    }

    // interest_events.notified means "the owner was actually told" — only a
    // real send sets it.
    if (status === "sent" && payload.interest_event_id) {
      await supabase
        .from("interest_events")
        .update({ notified: true })
        .eq("id", payload.interest_event_id)
    }

    return new Response(JSON.stringify({ status, provider, error: error ?? null }), {
      status: status === "failed" ? 502 : 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!phone) return finish("skipped", null, "recipient has no usable phone number")
  if (!message) return finish("skipped", null, "no message body")

  const provider = Deno.env.get("WHATSAPP_PROVIDER") ?? null
  const apiUrl = Deno.env.get("WHATSAPP_API_URL")
  const apiToken = Deno.env.get("WHATSAPP_API_TOKEN")
  const from = Deno.env.get("WHATSAPP_FROM") ?? ""

  // The expected state until a provider is chosen: fire, record, don't pretend.
  if (!apiUrl || !apiToken) {
    return finish("skipped", provider, "no WhatsApp provider configured (WHATSAPP_API_URL / WHATSAPP_API_TOKEN unset)")
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(buildBody(phone, message, from)),
    })

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      return finish("failed", provider, `provider responded ${response.status}: ${detail}`)
    }

    return finish("sent", provider)
  } catch (e) {
    return finish("failed", provider, e instanceof Error ? e.message : String(e))
  }
})
