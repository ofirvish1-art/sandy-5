"use client"

// Shown when someone arrives from a password-reset email. Supabase signs them
// in so the password can be changed, so without this screen they would land
// straight in the app and never be asked to set one.
//
// Visually identical to the onboarding screen: same dark card-on-primary
// layout, same input, button, helper and error styles.

import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { signOut, updatePassword } from "@/lib/supabase/auth"
import { BRAND } from "./data"
import { SanditLogo } from "./logo"

// Same rule the sign-up screen enforces.
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W]{8,15}$/

export function ResetPasswordScreen() {
  const { clearRecovering } = useAuth()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const passwordValid = PASSWORD_RE.test(password)
  const matches = confirm.length > 0 && confirm === password
  const valid = passwordValid && matches

  async function handleSubmit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)

    const result = await updatePassword(password)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-primary px-6 pb-8 pt-16 text-primary-foreground">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <SanditLogo variant="white" className="h-28 w-auto" />
        <p className="mt-4 text-balance text-lg text-primary-foreground/80">{BRAND.tagline}</p>
      </div>

      <div className="rounded-3xl bg-card p-5 text-right text-foreground">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="size-8" />
            </span>
            <h2 className="text-lg font-extrabold">הסיסמה עודכנה</h2>
            <p className="text-sm text-muted-foreground">אפשר להיכנס עכשיו עם הסיסמה החדשה.</p>
            <button
              type="button"
              onClick={clearRecovering}
              className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"
            >
              המשך לסנדיט
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-extrabold">בחירת סיסמה חדשה</h2>

            <div className="space-y-3">
              <div>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="סיסמה חדשה"
                    className={`w-full rounded-xl border bg-card px-3 py-3 pe-11 text-right text-sm outline-none focus:border-primary ${
                      password && !passwordValid ? "border-destructive" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p
                  className={`mt-1.5 text-xs font-semibold ${
                    password && !passwordValid ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  הסיסמה חייבת להכיל 8–15 תווים, ולשלב אותיות ומספרים.
                </p>
              </div>

              <div>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit()
                  }}
                  type={showPassword ? "text" : "password"}
                  placeholder="אישור סיסמה"
                  className={`w-full rounded-xl border bg-card px-3 py-3 text-right text-sm outline-none focus:border-primary ${
                    confirm && !matches ? "border-destructive" : "border-border"
                  }`}
                />
                {confirm && !matches && (
                  <p className="mt-1.5 text-xs font-semibold text-destructive">הסיסמאות אינן זהות.</p>
                )}
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-bold leading-relaxed text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={!valid || submitting}
              onClick={handleSubmit}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "שומר…" : "שמירת סיסמה חדשה"}
            </button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  clearRecovering()
                  signOut()
                }}
                className="font-bold text-primary underline"
              >
                ביטול
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
