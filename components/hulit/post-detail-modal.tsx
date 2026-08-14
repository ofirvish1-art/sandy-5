"use client"

import { Clock, MapPin, PackageOpen, Phone, Truck, Weight } from "lucide-react"
import { BottomSheet } from "./bottom-sheet"
import { ContactButtons, InterestButton } from "./contact-buttons"
import type { Listing } from "./data"

export function PostDetailModal({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  const isSupply = listing?.type === "supply"

  const rows = listing
    ? [
        { icon: Weight, label: "כמות", value: `${listing.quantity} קוב` },
        {
          icon: MapPin,
          label: "מיקום",
          value: listing.distanceKm != null ? `${listing.city} · ${listing.distanceKm} ק״מ` : listing.city,
        },
        { icon: Clock, label: "עיתוי", value: listing.timing },
        { icon: Truck, label: "הובלה", value: listing.transport },
        { icon: PackageOpen, label: "העמסה", value: listing.loading },
        // Own listings show the number back to you; on someone else's it's the
        // contact detail they agreed to publish at sign-up.
        ...(listing.contactPhone
          ? [{ icon: Phone, label: "טלפון", value: listing.contactPhone, ltr: true }]
          : []),
      ]
    : []

  return (
    <BottomSheet
      open={!!listing}
      onClose={onClose}
      title={listing?.material}
      footer={
        listing && listing.owner !== "me" ? (
          <div className="flex items-center gap-2">
            <ContactButtons listing={listing} />
            <InterestButton key={listing.id} listing={listing} />
          </div>
        ) : null
      }
    >
      {listing && (
        <div className="space-y-4 text-right">
          {listing.images && listing.images.length > 0 && (
            <div className="-mt-1 flex gap-2 overflow-x-auto">
              {listing.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={listing.material}
                  loading="lazy"
                  className="h-44 w-full shrink-0 rounded-2xl bg-muted object-cover"
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xl font-extrabold text-primary">
              {listing.price ? `₪${listing.price} / קוב` : listing.priceLabel}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isSupply ? "bg-sage-soft text-primary" : "bg-primary text-primary-foreground"
              }`}
            >
              {isSupply ? "מציע" : "מבקש"}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            פורסם ע״י {listing.ownerName} · {listing.createdAt}
          </p>

          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {rows.map((r) => {
              const Icon = r.icon
              return (
                <div key={r.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-bold text-foreground" dir={"ltr" in r && r.ltr ? "ltr" : undefined}>
                    {r.value}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    {r.label}
                    <Icon className="size-4 text-sage" />
                  </span>
                </div>
              )
            })}
          </div>

          {listing.details && (
            <div className="rounded-2xl bg-muted/60 p-4">
              <h4 className="mb-1 text-sm font-bold text-foreground">פרטים נוספים</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{listing.details}</p>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
