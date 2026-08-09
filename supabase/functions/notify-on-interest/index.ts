// supabase/functions/notify-on-interest/index.ts
//
// Triggered by a Supabase Database Webhook on INSERT into
// `interest_events` (see README.md for the exact webhook setup).
// Looks up the listing + its owner, then sends the owner a WhatsApp
// message via Twilio telling them someone is interested.
//
// Required secrets (set with `supabase secrets set ...`, see README):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (auto-available in Edge Functions)
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_WHATSAPP_FROM      e.g. "whatsapp:+14155238886" (Twilio sandbox number)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MATERIAL_LABELS: Record<string, string> = {
  sand: "חול",
  hamra: "חמרה",
  matza: "מצע",
  other: "חומר",
};

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Supabase DB webhooks send { type, table, record, old_record }
    const event = payload.record;
    if (!event) {
      return new Response("no record in payload", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: listing, error: listingErr } = await supabase
      .from("listings")
      .select("*, users:user_id(name, phone)")
      .eq("id", event.listing_id)
      .single();

    if (listingErr || !listing) {
      console.error("listing lookup failed", listingErr);
      return new Response("listing not found", { status: 404 });
    }

    const ownerPhone = listing.users?.phone;
    if (!ownerPhone) {
      return new Response("owner has no phone", { status: 200 });
    }

    const materialLabel = MATERIAL_LABELS[listing.material_type] || "חומר";
    const typeLabel = listing.type === "supply" ? "בהיצע" : "בביקוש";
    const channelLabel = event.channel === "whatsapp" ? "בוואטסאפ" : "בטלפון";

    const message =
      `שלום ${listing.users?.name || ""}! מישהו התעניין ${channelLabel} ` +
      `${typeLabel} שפרסמת: ${materialLabel}, ${listing.quantity_cubic} קוב ` +
      `ב${listing.location_text}. כדאי לבדוק את הטלפון שלך בקרוב.`;

    await sendWhatsApp(ownerPhone, message);

    await supabase
      .from("interest_events")
      .update({ notified: true })
      .eq("id", event.id);

    return new Response("ok", { status: 200 });
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

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${sid}:${token}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }
}
