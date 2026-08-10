"use client";

import Link from "next/link";
import MaterialBadge, { materialLabel } from "./MaterialBadge";
import { URGENCY_LABELS, TRANSPORT_LABELS, STATUS_LABELS, statusChipClass, formatPrice, waLink } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";

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

// showOwnerControls: pass true on screens where the viewer might own the
// listing (Profile) — shows a manual status dropdown + "ערוך מודעה" (items
// 1 and 7). Both are hidden automatically for listings that aren't yours.
export default function ListingCard({ listing, distanceKm, onExpressInterest, showOwnerControls, onStatusChange }) {
  const isSupply = listing.type === "supply";
  const viewer = typeof window !== "undefined" ? getStoredUser() : null;
  const isOwner = showOwnerControls && viewer && listing.user_id === viewer.id;

  const waText = `שלום, ראיתי את הפרסום שלך (${materialLabel(
    listing.material_type
  )}, ${listing.quantity_cubic} קו״ב) בחולית ורציתי לבדוק זמינות.`;

  async function handleInterest() {
    await logInterest(listing, "interest");
    onExpressInterest?.(listing);
  }

  async function handleStatusChange(e) {
    const status = e.target.value;
    await supabase.from("listings").update({ status }).eq("id", listing.id);
    onStatusChange?.(listing.id, status);
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

      {!isOwner && (
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
      )}

      {isOwner ? (
        <div className="flex gap-2 items-center pt-1 border-t border-sage-dark/30 mt-1">
          <select
            value={listing.status}
            onChange={handleStatusChange}
            className="text-xs border border-sage-dark/50 rounded-lg px-2 py-1.5 font-semibold bg-white flex-1"
          >
            <option value="open">רלוונטי</option>
            <option value="inTalks">בתהליך סגירה</option>
            <option value="closed">נסגר</option>
          </select>
          <Link
            href={`/${listing.type}?edit=${listing.id}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-olive text-olive"
          >
            ✏️ ערוך מודעה
          </Link>
        </div>
      ) : (
        <span className={statusChipClass(listing.status)}>{STATUS_LABELS[listing.status] || listing.status}</span>
      )}
    </div>
  );
}
