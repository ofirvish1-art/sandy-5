"use client";

import { Truck, Clock, MapPin, Package, MessageCircle, Phone, Send } from "lucide-react";
import { materialLabel } from "./MaterialBadge";
import { URGENCY_LABELS, TRANSPORT_LABELS, STATUS_LABELS, statusChipClass, formatPrice, formatRelativeTime, waLink } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { LEGAL_CONTENT } from "@/lib/legalContent";
import { useWizard } from "@/contexts/WizardContext";

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
  const { openWizard } = useWizard();

  const waText = `שלום, ראיתי את הפרסום שלך (${materialLabel(
    listing.material_type
  )}, ${listing.quantity_cubic} קו״ב) בסאנדיט ורציתי לבדוק זמינות.`;

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
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display font-bold text-base">{materialLabel(listing.material_type)}</div>
          <div className="text-[11px] text-forest/40 mt-0.5">{formatRelativeTime(listing.created_at)}</div>
        </div>
        <span className={`chip shrink-0 ${isSupply ? "bg-sage/60 text-olive-night" : "bg-olive-night text-sage"}`}>
          {isSupply ? "מציע" : "מבקש"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="pill">
          <Truck size={12} strokeWidth={2.25} /> {TRANSPORT_LABELS[listing.transport] || "—"}
        </span>
        <span className="pill">
          <Clock size={12} strokeWidth={2.25} /> {URGENCY_LABELS[listing.urgency] || "—"}
        </span>
        <span className="pill">
          <MapPin size={12} strokeWidth={2.25} /> {listing.location_text}
          {distanceKm != null ? ` · ${distanceKm} ק״מ` : ""}
        </span>
        <span className="pill">
          <Package size={12} strokeWidth={2.25} /> {listing.quantity_cubic} קו״ב
        </span>
      </div>

      <div className="font-display font-black text-lg">{formatPrice(listing)}</div>

      {listing.images?.[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={listing.images[0]} alt="" className="w-full h-40 object-cover rounded-xl" />
      )}

      {listing.notes && (
        <p className="text-sm text-forest/70 border-t border-sage-dark/30 pt-2">{listing.notes}</p>
      )}

      {!isOwner && (
        <div className="flex gap-2 pt-1">
          <button onClick={handleInterest} className="btn-olive flex-1 !px-2 text-sm flex items-center justify-center gap-1.5">
            <Send size={15} strokeWidth={2.25} /> אני מעוניין
          </button>
          <a
            href={waLink(listing.contact_phone, waText)}
            target="_blank"
            rel="noreferrer"
            onClick={() => logInterest(listing, "whatsapp")}
            aria-label="וואטסאפ"
            className="w-11 h-11 rounded-full border border-sage-dark/50 bg-white flex items-center justify-center shrink-0"
          >
            <MessageCircle size={17} strokeWidth={2.25} className="text-olive" />
          </a>
          <a
            href={`tel:${listing.contact_phone}`}
            onClick={() => logInterest(listing, "call")}
            aria-label="התקשר"
            className="w-11 h-11 rounded-full border border-sage-dark/50 bg-white flex items-center justify-center shrink-0"
          >
            <Phone size={17} strokeWidth={2.25} className="text-olive" />
          </a>
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
          <button
            type="button"
            onClick={() => openWizard(listing.type, listing.id)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-olive text-olive"
          >
            ✏️ ערוך מודעה
          </button>
        </div>
      ) : (
        <span className={statusChipClass(listing.status)}>{STATUS_LABELS[listing.status] || listing.status}</span>
      )}

      <p className="text-[10px] text-forest/40 leading-snug border-t border-sage-dark/20 pt-2">
        {LEGAL_CONTENT.listingNotice}
      </p>
    </div>
  );
}
