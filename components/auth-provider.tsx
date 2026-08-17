"use client"

// Holds the live Supabase session and the matching public.users profile.
// Everything in the app reads "who am I" from here — replacing the old
// site's localStorage-based identity.

import type { Session } from "@supabase/supabase-js"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { fetchProfile } from "@/lib/supabase/auth"
import type { UserRow } from "@/lib/supabase/types"

type AuthState = {
  session: Session | null
  profile: UserRow | null
  /** True until the initial session lookup has settled. */
  loading: boolean
  /**
   * True when this session came from a password-reset email. Supabase signs
   * the user in to let them set a new password, so without this flag they'd
   * land straight in the app and never be asked for one.
   */
  recovering: boolean
  clearRecovering: () => void
  refreshProfile: () => Promise<void>
  setProfile: (profile: UserRow) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfileState] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  const loadProfile = useCallback(async (authUserId: string | undefined) => {
    if (!authUserId) {
      setProfileState(null)
      return
    }

    // Sign-up creates the auth session first and the profile row a moment
    // later, so the SIGNED_IN callback can fire before the row exists.
    // Retry briefly rather than concluding the account has no profile.
    let row = await fetchProfile(authUserId)
    for (let attempt = 0; attempt < 3 && !row; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      row = await fetchProfile(authUserId)
    }

    // Never clobber a profile that sign-up already handed us directly.
    setProfileState((prev) => row ?? (prev?.auth_user_id === authUserId ? prev : null))
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      if (active) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return
      if (event === "PASSWORD_RECOVERY") setRecovering(true)
      if (event === "SIGNED_OUT") setRecovering(false)
      setSession(nextSession)
      await loadProfile(nextSession?.user.id)
      if (active) setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id)
  }, [loadProfile, session])

  const clearRecovering = useCallback(() => setRecovering(false), [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      recovering,
      clearRecovering,
      refreshProfile,
      setProfile: setProfileState,
    }),
    [session, profile, loading, recovering, clearRecovering, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/** The signed-in profile id, or null. Used everywhere a row needs an owner. */
export function useCurrentUserId(): string | null {
  return useAuth().profile?.id ?? null
}
