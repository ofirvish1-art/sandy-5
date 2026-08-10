// supabase/functions/notify-new-match/index.ts
//
// Triggered by a Supabase Database Webhook on INSERT into `listings`
// (see README / migration for setup). Runs the same fuzzy matching
// logic as lib/matching.js (duplicated here since Edge Functions run
// in Deno, separate from the Next.js app) against all open listings of
// the opposite type. If any match scores >= INSTANT_ALERT_THRESHOLD,
// WhatsApps BOTH listing owners.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const INSTANT_ALERT_THRESHOLD = 70;
const URGENCY_DAYS_FROM_NOW: Record<string, number> = { now: 0, today: 0, tomorrow: 1, week: 4, future: 10 };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function approxDateDays(listing: any) {
  const explicit = listing.available_until || listing.deadline;
  if (explicit) return Math.round((new Date(explicit).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return URGENCY_DAYS_FROM_NOW[listing.urgency] ?? 10;
}

function quantityScore(supply: any, demand: any) {
  if (!demand.quantity_cubic) return 0;
  return Math.max(0, Math.min(1, supply.quantity_cubic / demand.quantity_cubic));
}
function locationScore(supply: any, demand: any) {
  const dist = haversineKm(supply.latitude, supply.longitude, demand.latitude, demand.longitude);
  if (dist === null) return 0.5;
  if (dist <= 40) return 1;
  if (dist >= 80) return 0;
  return 1 - (dist - 40) / 40;
}
function timingScore(supply: any, demand: any) {
  const diff = Math.abs(approxDateDays(supply) - approxDateDays(demand));
  if (diff <= 7) return 1;
  if (diff >= 21) return 0;
  return 1 - (diff - 7) / 14;
}
function logisticsScore(supply: any, demand: any) {
  const transportOk = supply.transport === "flexible" || demand.transport === "flexible" || supply.transport !== demand.transport;
  const loadingOk = supply.has_loading !== demand.has_loading || supply.has_loading == null || demand.has_loading == null;
  return (transportOk ? 0.5 : 0.2) + (loadingOk ? 0.5 : 0.2);
}
function scoreMatch(supply: any, demand: any) {
  if (!supply.material_type || supply.material_type !== demand.material_type) return null;
  const q = quantityScore(supply, demand);
  const l = locationScore(supply, demand);
  const t = timingScore(supply, demand);
  const g = logisticsScore(supply, demand);
  return Math.round(q * 35 + l * 30 + t * 20 + g * 15);
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const newListing = payload.record;
    if (!newListing || newListing.status !== "open") {
      return new Response("nothing to do", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const oppositeType = newListing.type === "supply" ? "demand" : "supply";
    const { data: candidates } = await supabase
      .from("listings")
      .select("*, users:user_id(name, phone)")
      .eq("status", "open")
      .eq("type", oppositeType)
      .eq("material_type", newListing.material_type);

    if (!candidates || candidates.length === 0) {
      return new Response("no candidates", { status: 200 });
    }

    const { data: newOwner } = await supabase.from("users").select("name, phone").eq("id", newListing.user_id).single();

    let alerted = 0;
    for (const other of candidates) {
      const supply = newListing.type === "supply" ? newListing : other;
      const demand = newListing.type === "demand" ? newListing : other;
      const percent = scoreMatch(supply, demand);
      if (percent === null || percent < INSTANT_ALERT_THRESHOLD) continue;

      const text =
        "נמצאה התאמה בחולית! מודעה התואמת את הדרישות שלך פורסמה עכשיו. כנס לאפליקציה לצפייה בפרטים ויצירת קשר.";

      if (newOwner?.phone) await sendWhatsApp(newOwner.phone, text).catch((e) => console.error(e));
      if (other.users?.phone) await sendWhatsApp(other.users.phone, text).catch((e) => console.error(e));
      alerted++;
    }

    return new Response(`alerted for ${alerted} match(es)`, { status: 200 });
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
