// supabase/functions/whatsapp-reply-handler/index.ts
//
// Set this as your Twilio WhatsApp Sandbox's "WHEN A MESSAGE COMES IN"
// webhook (Twilio Console → Messaging → Try it out → WhatsApp sandbox
// settings). Twilio POSTs form-encoded fields (From, Body, ...) here
// whenever someone replies.
//
// Parses a reply of 1 / 2 / 3 (or the matching Hebrew phrase) from a
// listing owner and updates that listing's status:
//   1 → "כן עדיין רלוונטי"        → status stays "open"
//   2 → "עדיין בתהליך סגירה"      → status → "inTalks"
//   3 → "לא, סגרתי את העסקה"      → status → "closed"
//
// Heuristic: matches the most recent listing owned by that phone number
// that's currently awaiting a reply (follow_up_sent_at set, follow_up_status
// still null). If an owner has more than one listing awaiting a reply at
// once, this picks the most recently followed-up one — a known pilot-scale
// limitation; fine for a small trial, worth revisiting before wider launch.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  try {
    const form = await req.formData();
    const from = String(form.get("From") || ""); // e.g. "whatsapp:+972501234567"
    const body = String(form.get("Body") || "").trim();

    const phoneDigits = from.replace(/\D/g, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const choice = parseChoice(body);
    if (!choice) {
      // Didn't recognize the reply — ask again, don't guess.
      await reply(from, "לא הבנתי את התשובה. אנא השב עם 1, 2 או 3.");
      return twiml();
    }

    // Find the user by phone (match on last 9-10 digits to tolerate 0 vs 972 prefixes).
    const { data: users } = await supabase.from("users").select("id, phone").ilike("phone", `%${phoneDigits.slice(-9)}`);
    const user = users?.[0];
    if (!user) {
      return twiml();
    }

    const { data: pendingEvent } = await supabase
      .from("interest_events")
      .select("id, listing_id, listings!inner(id, user_id, status)")
      .not("follow_up_sent_at", "is", null)
      .is("follow_up_status", null)
      .eq("listings.user_id", user.id)
      .order("follow_up_sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pendingEvent) {
      await reply(from, "לא נמצאה מודעה שממתינה לאישור כרגע.");
      return twiml();
    }

    const statusMap = { relevant: "open", pending: "inTalks", closed: "closed" } as const;

    await supabase.from("listings").update({ status: statusMap[choice] }).eq("id", pendingEvent.listing_id);
    await supabase.from("interest_events").update({ follow_up_status: choice }).eq("id", pendingEvent.id);

    const confirmMsg = {
      relevant: "מעולה, השארנו את המודעה פעילה. תודה!",
      pending: "עודכן — סימנו את המודעה כ׳בתהליך סגירה׳.",
      closed: "עודכן — סגרנו את המודעה. בהצלחה בעסקה הבאה!",
    }[choice];
    await reply(from, confirmMsg);

    return twiml();
  } catch (err) {
    console.error(err);
    return twiml();
  }
});

function parseChoice(body: string): "relevant" | "pending" | "closed" | null {
  const t = body.trim();
  if (t === "1" || t.includes("כן עדיין רלוונטי") || t === "כן") return "relevant";
  if (t === "2" || t.includes("בתהליך סגירה")) return "pending";
  if (t === "3" || t.includes("סגרתי") || t.includes("לא רלוונטי")) return "closed";
  return null;
}

async function reply(toWhatsApp: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM")!;

  const form = new URLSearchParams();
  form.set("From", from);
  form.set("To", toWhatsApp);
  form.set("Body", body);

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
}

function twiml() {
  return new Response("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
