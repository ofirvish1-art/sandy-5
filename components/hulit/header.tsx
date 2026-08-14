"use client"

import { Bell, MessageSquareHeart } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { useListings } from "@/components/listings-provider"
import { supabase } from "@/lib/supabase/client"
import { getLastSeen } from "@/lib/supabase/notifications"
import { BRAND } from "./data"
import { SanditLogo } from "./logo"

export function Header({
  onFeedback,
  onNotifications,
}: {
  onFeedback: () => void
  onNotifications: () => void
}) {
  const { profile } = useAuth()
  const { listings, opportunities } = useListings()
  const [unseenContacts, setUnseenContacts] = useState(0)

  // Contractors greet each other by first name.
  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? ""

  const myListingIds = listings.filter((l) => l.owner === "me").map((l) => l.id)
  const myIdsKey = myListingIds.join(",")

  // The dot must mean something: only contacts on your own listings, by
  // someone other than you, since you last opened the panel.
  useEffect(() => {
    if (!profile || myListingIds.length === 0) {
      setUnseenContacts(0)
      return
    }
    let active = true
    supabase
      .from("interest_events")
      .select("id", { count: "exact", head: true })
      .in("listing_id", myListingIds)
      .neq("viewer_user_id", profile.id)
      .gt("created_at", getLastSeen() ?? "1970-01-01T00:00:00Z")
      .then(({ count }) => {
        if (active) setUnseenContacts(count ?? 0)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, myIdsKey])

  const hasUnseen = unseenContacts > 0 || opportunities.length > 0

  return (
    <header className="bg-primary text-primary-foreground rounded-b-[2rem] px-5 pt-4 pb-7">
      <div className="relative flex items-center justify-center">
        {/* Action buttons pinned to the start edge so the greeting can center */}
        <div className="absolute start-0 top-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onFeedback}
            aria-label="משוב"
            className="relative flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            <MessageSquareHeart className="size-5" />
          </button>
          <button
            type="button"
            onClick={onNotifications}
            aria-label={hasUnseen ? "התראות חדשות" : "התראות"}
            className="relative flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            <Bell className="size-5" />
            {/* Only shown when there is genuinely something unseen. */}
            {hasUnseen && (
              <span className="absolute end-2.5 top-2.5 size-2 rounded-full bg-sage ring-2 ring-primary" />
            )}
          </button>
        </div>

        {/* Official SANDIT logo pinned to the top-left, greeting stays centered */}
        <SanditLogo variant="white" className="absolute left-0 top-0 h-11 w-auto" />

        <div className="px-24 text-center">
          <h1 className="text-xl font-extrabold leading-tight">
            {firstName ? `שלום ${firstName}` : "שלום"}
          </h1>
          <p className="text-sm text-primary-foreground/70">ברוך הבא ל{BRAND.he}</p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-semibold text-sage">{BRAND.tagline}</p>
    </header>
  )
}
