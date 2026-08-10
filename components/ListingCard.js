"use client";

import MaterialBadge, { materialLabel } from "./MaterialBadge";
import { URGENCY_LABELS, TRANSPORT_LABELS, STATUS_LABELS, statusChipClass, formatPrice, waLink } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";

// Logs a click on Call / WhatsApp / "Express Interest". The
// send-relevance-check scheduled function reads this table and, exactly
// 1 hour after the earliest un-followed-up click on a listing, WhatsApps
// the owner asking if the post is still relevant. See supabase/schema.sql
// and supabase/functions/send-relevance-check.
async function logInterest(listing, channel) {
  const viewer = getStoredUser();
  try {
    await supabase.from("interest_events").insert({
      listing_id: listing.id,
      viewer_user_id: viewer?.id ?? null,
      channel, // 'call' | 'whatsapp' | 'interest'
    });
  } catch (e) {
    console.error("could not log interest event", e);
  }
}

export default function ListingCard({ listing, distanceKm, onExpressInterest }) {
  const isSupply = listing.type === "supply";

  const waText = `שלום, ראיתי את הפרסום שלך (${materialLabel(
    listing.material_type
  )}, ${listing.quantity_cubic} קו״ב) בחולית ורציתי לבדוק זמינות.`;

  async function handleInterest() {
    await logInterest(listing, "interest");
    onExpressInterest?.(listing);
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="chip bg-olive/10 text-olive">{isSupply ? "היצע" : "ביקוש"}</span>
        <MaterialBadge type={listing.material_type} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <div className="text-forest/40 text-xs">כמות</div>
          <div className="font-bold">{listing.quantity_cubic} קו״ב</div>
        </div>
        <div>
          <div className="text-forest/40 text-xs">מיקום</div>
          <div className="font-bold">{listing.location_text}</div>
        </div>
        <div>
          <div className="text-forest/40 text-xs">מועד</div>
          <div className="font-bold">{URGENCY_LABELS[listing.urgency] || "—"}</div>
        </div>
        <div>
          <div className="text-forest/40 text-xs">מחיר</div>
          <div className="font-bold">{formatPrice(listing)}</div>
        </div>
        {distanceKm != null && (
          <div>
            <div className="text-forest/40 text-xs">מרחק</div>
            <div className="font-bold">{distanceKm} ק״מ</div>
          </div>
        )}
        <div>
          <div className="text-forest/40 text-xs">הובלה</div>
          <div className="font-bold">{TRANSPORT_LABELS[listing.transport] || "—"}</div>
        </div>
      </div>

      {listing.images?.[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.images[0]} alt="" className="w-full h-40 object-cover rounded-xl" />
      )}

      {listing.notes && (
        <p className="text-sm text-forest/70 border-t border-sage-dark/30 pt-2">{listing.notes}</p>
      )}

      <div className="flex gap-2 pt-1">
        <a href={`tel:${listing.contact_phone}`} onClick={() => logInterest(listing, "call")} className="btn-secondary flex-1 !px-2 text-sm">
          📞 התקשר
        </a>
        <a
          href={waLink(listing.contact_phone, waText)}
          target="_blank"
          rel="noreferrer"
          onClick={() => logInterest(listing, "whatsapp")}
          className="btn-secondary flex-1 !px-2 text-sm"
        >
          💬 וואטסאפ
        </a>
        <button onClick={handleInterest} className="btn-olive flex-1 !px-2 text-sm">
          📩 אני מעוניין
        </button>
      </div>

      <span className={statusChipClass(listing.status)}>{STATUS_LABELS[listing.status] || listing.status}</span>
    </div>
  );
}
