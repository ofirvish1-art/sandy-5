// WhatsApp delivery for interest notifications.
//
// Called by the `interest_events_notify` database trigger (migration 010/014)
// via pg_net, once app_config.notify_function_url points here. Deploys with
// the rest of the app on every push — no separate CLI step.
//
// PROVIDER-AGNOSTIC. Everything about the provider comes from environment
// variables, so switching from one WhatsApp BSP to another is a settings
// change. If your provider's request body differs, buildBody() is the only
// function that needs editing.
//
// Required environment variables (set these in Vercel → Settings → Env Vars):
//
//   NOTIFY_SHARED_SECRET       must match app_config.notify_service_key
//   SUPABASE_SERVICE_ROLE_KEY  to update notification_attempts (server-only!)
//   WHATSAPP_API_URL           provider send endpoint
//   WHATSAPP_API_TOKEN         provider bearer token
//
// Optional:
//   WHATSAPP_PROVIDER       label recorded on each attempt, e.g. "meta"
//   WHATSAPP_FROM           sender id, if your provider needs one
//   WHATSAPP_TEMPLATE_NAME  see the note on templates below
//   WHATSAPP_TEMPLATE_LANG  defaults to "he"
//
// ── ON TEMPLATES ────────────────────────────────────────────────────────────
// WhatsApp does not allow free-form messages to someone who hasn't messaged
// you in the last 24 hours, and "somebody is interested in your listing" is
// exactly that kind of unsolicited message. So in production you need an
// APPROVED TEMPLATE and WHATSAPP_TEMPLATE_NAME set.
//
// With no template name configured this sends plain text instead, which only
// works inside that 24-hour window — useful for testing against your own
// number, not for real users.

import { createClient } from "@supabase/supabase-js"

type TriggerPayload = {
  attempt_id?: string
  interest_event_id?: string
  recipient_phone?: string
  payload?: {
    material?: string
    quantity?: number | string
    location?: string
    owner_name?: string
    actor_name?: string
  }
}

/** Israeli local numbers to international, no plus. */
function toInternational(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("972")) return digits
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits
}

/**
 * The two template variables, in order: who to greet, and what about.
 * A template registered as
 *   "שלום {{1}}, מישהו התעניין במודעה שלך בסנדיט: {{2}}."
 * lines up with this.
 */
function templateVariables(p: NonNullable<TriggerPayload["payload"]>): string[] {
  const name = (p.owner_name ?? "").trim() || "קבלן"
  const material = (p.material ?? "").trim()
  const quantity = p.quantity != null ? String(p.quantity) : ""
  const subject = [material, quantity ? `${quantity} קו״ב` : ""].filter(Boolean).join(", ")
  return [name, subject || "מודעה"]
}

/** Plain-text fallback, only valid inside the 24-hour service window. */
function plainText(p: NonNullable<TriggerPayload["payload"]>): string {
  const [name, subject] = templateVariables(p)
  const where = (p.location ?? "").trim()
  return `שלום ${name}, מישהו התעניין במודעה שלך בסנדיט: ${subject}${where ? ` ב${where}` : ""}.`
}

/**
 * Shaped for Meta's WhatsApp Cloud API, which most providers mirror.
 * If yours differs, this is the only function to change.
 */
function buildBody(to: string, p: NonNullable<TriggerPayload["payload"]>) {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME
  const from = process.env.WHATSAPP_FROM

  if (templateName) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "he" },
        components: [
          {
            type: "body",
            parameters: templateVariables(p).map((text) => ({ type: "text", text })),
          },
        ],
      },
      ...(from ? { from } : {}),
    }
  }

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: plainText(p) },
    ...(from ? { from } : {}),
  }
}

export async function POST(request: Request) {
  // The trigger sends app_config.notify_service_key as a bearer token. Without
  // this check anyone who found the URL could spam your customers.
  const expected = process.env.NOTIFY_SHARED_SECRET
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!expected || provided !== expected) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: TriggerPayload
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  // notification_attempts has no UPDATE policy, so writing the outcome needs
  // the service role. It is read here only, never sent to the browser.
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null

  const attemptId = body.attempt_id
  const phone = toInternational(body.recipient_phone ?? "")
  const provider = process.env.WHATSAPP_PROVIDER ?? null
  const message = body.payload ? plainText(body.payload) : null

  async function finish(status: "sent" | "failed" | "skipped", error?: string) {
    if (supabase && attemptId) {
      const { error: updateError } = await supabase
        .from("notification_attempts")
        .update({
          status,
          provider,
          error: error ?? null,
          message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attemptId)
      if (updateError) console.error("could not update notification_attempts", updateError)
    }

    // Only a real send means the owner was actually told.
    if (status === "sent" && supabase && body.interest_event_id) {
      await supabase
        .from("interest_events")
        .update({ notified: true })
        .eq("id", body.interest_event_id)
    }

    return Response.json({ status, provider, error: error ?? null }, {
      status: status === "failed" ? 502 : 200,
    })
  }

  if (!supabase) return finish("failed", "SUPABASE_SERVICE_ROLE_KEY is not set")
  if (!phone) return finish("skipped", "recipient has no usable phone number")
  if (!body.payload) return finish("skipped", "no message payload")

  const apiUrl = process.env.WHATSAPP_API_URL
  const apiToken = process.env.WHATSAPP_API_TOKEN
  if (!apiUrl || !apiToken) {
    return finish("skipped", "no WhatsApp provider configured (WHATSAPP_API_URL / WHATSAPP_API_TOKEN unset)")
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(buildBody(phone, body.payload)),
    })

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      return finish("failed", `provider responded ${response.status}: ${detail}`)
    }
    return finish("sent")
  } catch (e) {
    return finish("failed", e instanceof Error ? e.message : String(e))
  }
}
