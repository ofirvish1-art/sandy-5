"use client";

import MaterialBadge, { materialLabel } from "./MaterialBadge";
import { URGENCY_LABELS, TRANSPORT_LABELS, formatPrice, waLink } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";

// Logs an "interest" event. A Supabase DB webhook on this table
// triggers the notify-on-interest Edge Function, which WhatsApps /
// SMSs the listing owner. See supabase/schema.sql + README.
async function logInterest(listing, channel) {
  const viewer = getStoredUser();
  try {
    await supabase.from("interest_events").insert({
      listing_id: listing.id,
      viewer_user_id: viewer?.id ?? null,
      channel, // 'call' | 'whatsapp'
    });
  } catch (e) {
    console.error("could not log interest event", e);
  }
}

export default function ListingCard({ listing, distanceKm, onStatusChange }) {
  const isSupply = listing.type === "supply";
  const accent = isSupply ? "border-supply-500" : "border-demand-500";
  const chip = isSupply
    ? "bg-supply-50 text-supply-600"
    : "bg-demand-50 text-demand-600";

  const waText = `שלום, ראיתי את הפרסום שלך (${materialLabel(
    listing.material_type
  )}, ${listing.quantity_cubic} קוב) במרקטפלייס קבלני עפר ורציתי לבדוק זמינות.`;

  return (
    <div className={`card border-s-4 ${accent} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${chip}`}>
          {isSupply ? "היצע" : "ביקוש"}
        </span>
        <MaterialBadge type={listing.material_type} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <div className="text-stone-400 text-xs">כמות</div>
          <div className="font-bold">{listing.quantity_cubic} קוב</div>
        </div>
        <div>
          <div className="text-stone-400 text-xs">מיקום</div>
          <div className="font-bold">{listing.location_text}</div>
        </div>
        <div>
          <div className="text-stone-400 text-xs">זמן</div>
          <div className="font-bold">{URGENCY_LABELS[listing.urgency] || "—"}</div>
        </div>
        <div>
          <div className="text-stone-400 text-xs">מחיר</div>
          <div className="font-bold">{formatPrice(listing)}</div>
        </div>
        {distanceKm != null && (
          <div>
            <div className="text-stone-400 text-xs">מרחק</div>
            <div className="font-bold">{distanceKm} ק״מ</div>
          </div>
        )}
        <div>
          <div className="text-stone-400 text-xs">הובלה</div>
          <div className="font-bold">{TRANSPORT_LABELS[listing.transport] || "—"}</div>
        </div>
      </div>

      {listing.notes && (
        <p className="text-sm text-stone-600 border-t border-stone-100 pt-2">{listing.notes}</p>
      )}

      <div className="flex gap-2 pt-1">
        <a
          href={`tel:${listing.contact_phone}`}
          onClick={() => logInterest(listing, "call")}
          className="btn-secondary flex-1"
        >
          📞 התקשר
        </a>
        <a
          href={waLink(listing.contact_phone, waText)}
          target="_blank"
          rel="noreferrer"
          onClick={() => logInterest(listing, "whatsapp")}
          className="btn-primary flex-1"
        >
          💬 וואטסאפ
        </a>
      </div>

      {onStatusChange && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100 mt-1">
          {[
            ["open", "פתוח"],
            ["inTalks", "בשיחה"],
            ["closed", "נסגר"],
            ["notRelevant", "לא רלוונטי"],
            ["cancelled", "בוטל"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => onStatusChange(listing, value)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold
                ${listing.status === value
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-600 border-stone-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
