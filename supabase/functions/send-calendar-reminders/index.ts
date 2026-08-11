// supabase/functions/send-calendar-reminders/index.ts
//
// Called every 10 minutes by pg_cron (see migration_005). Finds calendar
// events whose reminder_at has passed but hasn't been sent yet, and
// WhatsApps the owner: "תזכורת מסאנדיט: ...".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("calendar_events")
      .select("*, users:user_id(name, phone)")
      .not("reminder_at", "is", null)
      .is("reminder_sent_at", null)
      .lte("reminder_at", now);

    if (error) throw error;
    if (!due || due.length === 0) return new Response("nothing due", { status: 200 });

    let sent = 0;
    for (const event of due) {
      const phone = event.users?.phone;
      if (!phone) {
        await supabase.from("calendar_events").update({ reminder_sent_at: new Date().toISOString() }).eq("id", event.id);
        continue;
      }

      const dateLabel = new Date(event.event_date).toLocaleDateString("he-IL", { day: "numeric", month: "long" });
      const timeLabel = new Date(event.reminder_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
      // Item 3: phrase the reminder relative to how far out it was set —
      // "אותו היום" reminders say "היום", "יום לפני" say "מחר", etc.
      const relativePhrase =
        { sameDay: "היום", dayBefore: "מחר", twoDaysBefore: "בעוד יומיים" }[event.reminder_offset] || `ב-${dateLabel}`;
      const message = `תזכורת מסאנדיט: ${relativePhrase} בשעה ${timeLabel} — ${event.title}`;

      try {
        await sendWhatsApp(phone, message);
        await supabase.from("calendar_events").update({ reminder_sent_at: new Date().toISOString() }).eq("id", event.id);
        sent++;
      } catch (err) {
        console.error("failed to send reminder", event.id, err);
      }
    }

    return new Response(`sent ${sent} reminder(s)`, { status: 200 });
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
  if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
}
