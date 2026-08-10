// supabase/functions/send-relevance-check/index.ts
//
// Called every 10 minutes by pg_cron (see migration_002_hulit.sql).
// Finds listings with an interaction (call/whatsapp/interest click) from
// roughly an hour ago that hasn't been followed up on yet, and WhatsApps
// the owner: "is this still relevant?"
//
// IMPORTANT — sandbox limitation: real tappable WhatsApp quick-reply
// buttons require an approved Twilio Content Template (or Meta's
// WhatsApp Cloud API interactive messages), which needs Meta Business
// verification — not available on a fresh sandbox account. As a
// pilot-friendly stand-in, this sends plain text and asks the owner to
// reply with 1, 2, or 3. whatsapp-reply-handler.ts parses that reply.
// Swap in real buttons later without changing anything else here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Oldest un-followed-up interaction per listing, at least 1 hour old.
    const { data: dueEvents, error } = await supabase
      .from("interest_events")
      .select("id, listing_id, created_at")
      .is("follow_up_sent_at", null)
      .lte("created_at", oneHourAgo)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!dueEvents || dueEvents.length === 0) {
      return new Response("nothing due", { status: 200 });
    }

    // Keep only the first due event per listing this run.
    const seenListing = new Set<string>();
    const toProcess = dueEvents.filter((e) => {
      if (seenListing.has(e.listing_id)) return false;
      seenListing.add(e.listing_id);
      return true;
    });

    let sent = 0;
    for (const event of toProcess) {
      const { data: listing } = await supabase
        .from("listings")
        .select("*, users:user_id(name, phone)")
        .eq("id", event.listing_id)
        .single();

      if (!listing || listing.status !== "open" || !listing.users?.phone) {
        // Already closed/not open — skip, but still mark processed so we
        // don't keep re-checking it every 10 minutes.
        await supabase.from("interest_events").update({ follow_up_sent_at: new Date().toISOString() }).eq("id", event.id);
        continue;
      }

      const message =
        `שלום ${listing.users.name || ""}! ראינו שפנו אליך לאחרונה בנוגע לפוסט זה. האם הפוסט עדיין רלוונטי?\n\n` +
        `1 — כן עדיין רלוונטי\n` +
        `2 — עדיין בתהליך סגירה\n` +
        `3 — לא, סגרתי את העסקה\n\n` +
        `השב עם המספר המתאים.`;

      try {
        await sendWhatsApp(listing.users.phone, message);
        await supabase
          .from("interest_events")
          .update({ follow_up_sent_at: new Date().toISOString() })
          .eq("id", event.id);
        sent++;
      } catch (err) {
        console.error("failed to notify listing", event.listing_id, err);
      }
    }

    return new Response(`sent ${sent} follow-up(s)`, { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});

async function sendWhatsApp(toPhone: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = Deno.env.get("TWILIO_WHATSAPP_FROM")!;

  const digits = toPhone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;

  const form = new URLSearchParams();
  form.set("From", from);
  form.set("To", `whatsapp:+${intl}`);
  form.set("Body", body);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${sid}:${token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
  }
}
