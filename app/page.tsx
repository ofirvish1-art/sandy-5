"use client"

import { RefreshCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { ListingsProvider } from "@/components/listings-provider"
import { NotificationsProvider } from "@/components/notifications-provider"
import { RefreshOnFocus } from "@/components/refresh-on-focus"
import { signOut } from "@/lib/supabase/auth"
import { AdsScreen } from "@/components/hulit/ads-screen"
import { BottomNav, type TabKey } from "@/components/hulit/bottom-nav"
import { CalendarScreen } from "@/components/hulit/calendar-screen"
import type { Listing, ListingType } from "@/components/hulit/data"
import { FeedbackModal } from "@/components/hulit/feedback-modal"
import { Header } from "@/components/hulit/header"
import { HomeScreen } from "@/components/hulit/home-screen"
import { LiveNotificationToasts } from "@/components/hulit/live-notification-toast"
import { MapScreen } from "@/components/hulit/map-screen"
import { NotificationsSheet } from "@/components/hulit/notifications-sheet"
import { OnboardingScreen } from "@/components/hulit/onboarding-screen"
import { PostDetailModal } from "@/components/hulit/post-detail-modal"
import { ProfileScreen } from "@/components/hulit/profile-screen"
import { ResetPasswordScreen } from "@/components/hulit/reset-password-screen"
import { WizardModal } from "@/components/hulit/wizard-modal"

export default function Page() {
  // "Onboarded" is now a real Supabase session with a matching profile row,
  // not a local boolean. Both halves must be present: an auth account with
  // no profile can't own listings.
  const { session, profile, loading: authLoading, recovering } = useAuth()
  const onboarded = Boolean(session && profile)

  const [tab, setTab] = useState<TabKey>("home")
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [wizardType, setWizardType] = useState<ListingType | null>(null)
  const [activeListing, setActiveListing] = useState<Listing | null>(null)
  const [adsFocus, setAdsFocus] = useState<"inprogress" | undefined>(undefined)
  const [adsSegment, setAdsSegment] = useState<"all" | "mine">("all")
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // Refresh-on-focus lives in <RefreshOnFocus> below, inside the provider, so
  // it can refetch rather than remount. Any sheet holding user input pauses
  // it — see the component for why that matters.
  const aSheetIsOpen = wizardType !== null || activeListing !== null || feedbackOpen || notificationsOpen

  // Restoring a session from storage takes a beat — showing the login form
  // first would flash it at people who are already signed in.
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-primary text-sm text-primary-foreground/80">
        טוען…
      </main>
    )
  }

  // Arrived from a reset email: Supabase has signed them in, but the only
  // thing they should be able to do is choose a new password.
  if (recovering) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-primary">
        <ResetPasswordScreen />
      </main>
    )
  }

  // A signed-in account whose profile row is missing (an orphan from a failed
  // sign-up) would otherwise sit on the login screen forever, already logged
  // in and unable to log in again. Give it an explicit way out.
  if (session && !profile) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-primary px-8 text-center text-primary-foreground">
        <p className="text-sm leading-relaxed">
          החשבון קיים אך לא נמצאו פרטי המשתמש. התנתק ונסה להירשם מחדש.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-2xl bg-card px-6 py-3 text-sm font-bold text-primary"
        >
          התנתקות
        </button>
      </main>
    )
  }

  if (!onboarded) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-primary">
        <OnboardingScreen />
      </main>
    )
  }

  return (
    <ListingsProvider>
    <NotificationsProvider>
    <RefreshOnFocus paused={aSheetIsOpen} onRefreshed={showToast} />
    <main className="mx-auto min-h-screen max-w-md bg-background pb-28">
      <Header
        onFeedback={() => setFeedbackOpen(true)}
        onNotifications={() => setNotificationsOpen(true)}
      />

      {tab === "home" && (
        <HomeScreen
          onCompose={(t) => setWizardType(t)}
          onOpenListing={setActiveListing}
          onNavigate={(t, opts) => {
            if (t === "ads") {
              setAdsFocus(opts?.focus)
              setAdsSegment(opts?.segment === "mine" ? "mine" : "all")
            }
            setTab(t)
          }}
        />
      )}
      {tab === "ads" && (
        <AdsScreen
          key={`${adsFocus ?? "all"}-${adsSegment}`}
          onOpenListing={setActiveListing}
          onNotify={showToast}
          initialFocus={adsFocus}
          initialSegment={adsSegment}
        />
      )}
      {tab === "calendar" && <CalendarScreen onNotify={showToast} />}
      {tab === "map" && <MapScreen />}
      {tab === "profile" && <ProfileScreen onNotify={showToast} />}

      <BottomNav
        active={tab}
        onChange={(t) => {
          if (t === "ads") {
            setAdsFocus(undefined)
            setAdsSegment("all")
          }
          setTab(t)
        }}
        onCompose={(t) => setWizardType(t)}
      />

      <WizardModal
        open={wizardType !== null}
        type={wizardType ?? "supply"}
        onClose={() => setWizardType(null)}
        onNotify={showToast}
        onOpenListing={(l) => {
          setWizardType(null)
          setActiveListing(l)
        }}
      />
      <LiveNotificationToasts />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <NotificationsSheet
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpenListing={setActiveListing}
      />
      <PostDetailModal listing={activeListing} onClose={() => setActiveListing(null)} />

      {/* Global toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-32 z-[60] flex justify-center px-6">
          <div className="animate-toast-in flex max-w-md items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg">
            <RefreshCw className="size-4 text-sage" />
            {toast}
          </div>
        </div>
      )}
    </main>
    </NotificationsProvider>
    </ListingsProvider>
  )
}
