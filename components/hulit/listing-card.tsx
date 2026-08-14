"use client"

import { Clock, MapPin, Pencil, Send, Truck } from "lucide-react"
import { ContactButtons } from "./contact-buttons"
import { type Listing, type ListingStatus, STATUS_LABELS } from "./data"

const STATUS_STYLES: Record<ListingStatus, string> = {
  relevant: "bg-success/15 text-success",
  closing: "bg-warning/20 text-[oklch(0.45_0.1_85)]",
  closed: "bg-muted text-muted-foreground",
}

export function ListingCard({
  listing,
  onOpen,
  onEdit,
  onStatusChange,
  compact = false,
}: {
  listing: Listing
  onOpen: (l: Listing) => void
  onEdit?: (l: Listing) => void
  onStatusChange?: (id: string, status: ListingStatus) => void
  compact?: boolean
}) {
  const isSupply = listing.type === "supply"
  const isMine = listing.owner === "me"

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl bg-card p-4 text-right shadow-sm ${compact ? "w-72 shrink-0" : "w-full"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            isSupply ? "bg-sage-soft text-primary" : "bg-primary text-primary-foreground"
          }`}
        >
          {isSupply ? "מציע" : "מבקש"}
        </span>
        <div>
          <h3 className="text-base font-extrabold text-foreground">{listing.material}</h3>
          <p className="text-xs text-muted-foreground">{listing.ownerName} · {listing.createdAt}</p>
        </div>
      </div>

      {/* Supply listings require a photo at publish time; show it. */}
      {listing.images && listing.images.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.images[0]}
          alt={listing.material}
          loading="lazy"
          className="h-36 w-full rounded-xl bg-muted object-cover"
        />
      )}

      <div className="flex flex-wrap justify-end gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
          {listing.quantity} קוב <Layers />
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
          {/* Distance is only shown when we have a real reference point to
              measure from — never a placeholder number. */}
          {listing.city}
          {listing.distanceKm != null ? ` (${listing.distanceKm} ק״מ)` : ""} <MapPin className="size-3.5" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
          {listing.timing} <Clock className="size-3.5" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
          {listing.transport} <Truck className="size-3.5" />
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold text-primary">
          {listing.price ? `₪${listing.price} / קוב` : listing.priceLabel}
        </span>
        {isMine ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[listing.status]}`}>
            {STATUS_LABELS[listing.status]}
          </span>
        ) : null}
      </div>

      {isMine && onStatusChange ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (onEdit ?? onOpen)(listing)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm font-bold text-foreground"
          >
            <Pencil className="size-4" /> ערוך מודעה
          </button>
          <select
            value={listing.status}
            onChange={(e) => onStatusChange(listing.id, e.target.value as ListingStatus)}
            className="rounded-xl border border-border bg-card py-2 pe-3 ps-2 text-sm font-bold text-foreground"
            aria-label="סטטוס מודעה"
          >
            <option value="relevant">רלוונטי</option>
            <option value="closing">בתהליך סגירה</option>
            <option value="closed">נסגר</option>
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <ContactButtons listing={listing} size="sm" />
          <button
            type="button"
            onClick={() => onOpen(listing)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
          >
            אני מעוניין <Send className="size-4" />
          </button>
        </div>
      )}
    </article>
  )
}

function Layers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
      <path d="m12 2 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
      <path d="m3 12 9 5 9-5" strokeLinejoin="round" />
    </svg>
  )
}
