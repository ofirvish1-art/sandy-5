"use client"

import { Bell, MessageSquareHeart } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useNotifications } from "@/components/notifications-provider"
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
  // Real unread rows now, rather than a last-seen timestamp in localStorage.
  const { unreadCount } = useNotifications()

  // Contractors greet each other by first name.
  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? ""

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
            aria-label={unreadCount > 0 ? `התראות — ${unreadCount} חדשות` : "התראות"}
            className="relative flex size-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            <Bell className="size-5" />
            {/* Count badge — same shape and type scale as the filter button's
                count, ringed against the primary header like the old dot. */}
            {unreadCount > 0 && (
              <span className="absolute -end-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-success text-xs font-bold text-white ring-2 ring-primary">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
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
