"use client"

// Refreshes data when the app regains focus.
//
// This used to be done by bumping a `key` on the provider, which remounted the
// whole authenticated tree. That wiped every open form: choosing a photo opens
// the OS file picker, which blurs the window, so returning from the picker
// refocused it and destroyed the half-filled publishing wizard.
//
// Refetching leaves component state alone, so the same feature no longer
// costs the user their work. It also pauses while a sheet is open, so a toast
// never pops over something being filled in.

import { useEffect, useRef } from "react"
import { useListings } from "@/components/listings-provider"

export function RefreshOnFocus({
  paused = false,
  onRefreshed,
}: {
  paused?: boolean
  onRefreshed?: (msg: string) => void
}) {
  const { refresh } = useListings()

  // Read through refs so re-renders don't detach and reattach the listeners.
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh
  const notifyRef = useRef(onRefreshed)
  notifyRef.current = onRefreshed

  useEffect(() => {
    let last = Date.now()

    const run = () => {
      if (pausedRef.current) return
      // Debounce so a quick blur/focus doesn't double-fire.
      if (Date.now() - last < 800) return
      last = Date.now()
      refreshRef.current()
      notifyRef.current?.("רועננו המודעות וההתראות")
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") run()
    }

    window.addEventListener("focus", run)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("focus", run)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  return null
}
