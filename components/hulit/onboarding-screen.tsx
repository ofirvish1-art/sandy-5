"use client"

import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { signIn, signUp } from "@/lib/supabase/auth"
import { BottomSheet } from "./bottom-sheet"
import { BRAND, type LegalSection, LEGAL_PRIVACY, LEGAL_TERMS } from "./data"
import { SanditLogo } from "./logo"

const LEGAL_DOCS: Record<string, { title: string; sections: LegalSection[] }> = {
  terms: { title: "תנאי שימוש", sections: LEGAL_TERMS },
  privacy: { title: "מדיניות פרטיות", sections: LEGAL_PRIVACY },
}

const CHECKS = [
  { id: "terms", label: "קראתי ואני מסכים ל", link: "תנאי השימוש", suffix: ` של ${BRAND.he}.` },
  { id: "privacy", label: "קראתי ואני מסכים ל", link: "מדיניות הפרטיות", suffix: ` של ${BRAND.he}.` },
  {
    id: "wa",
    label: `אני מסכים לקבל מ${BRAND.he} הודעות WhatsApp תפעוליות בנוגע למודעות, פניות, עסקאות ואבטחת החשבון.`,
  },
]

// 8–15 characters, must contain at least one letter and one digit.
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d\W]{8,15}$/
// Basic email format check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Mode = "signup" | "login"

export function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>("signup")
  const [phone, setPhone] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [doc, setDoc] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setProfile } = useAuth()

  const isSignup = mode === "signup"
  const passwordValid = PASSWORD_RE.test(password)
  const emailValid = EMAIL_RE.test(email.trim())
  const allChecked = CHECKS.every((c) => checked[c.id])

  const valid = isSignup
    ? !!name.trim() && emailValid && phone.trim().length >= 9 && passwordValid && allChecked
    : loginId.trim().length > 0 && password.length > 0

  function switchMode(next: Mode) {
    setMode(next)
    setPassword("")
    setError(null)
  }

  // On success nothing is called back: onAuthStateChange fires, AuthProvider
  // picks up the session, and app/page.tsx swaps this screen for the app.
  async function handleSubmit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)

    const result = isSignup
      ? await signUp({
          name,
          email,
          phone,
          password,
          consents: { terms: !!checked.terms, privacy: !!checked.privacy, whatsapp: !!checked.wa },
        })
      : await signIn(loginId, password)

    if (!result.ok) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    // Hand the freshly-created profile straight to the provider, so entering
    // the app doesn't depend on the retry above winning the race.
    if (isSignup && "profile" in result.data) {
      setProfile(result.data.profile)
    }
    // On success this component unmounts, so no state update is needed.
  }

  return (
    <div className="flex min-h-screen flex-col bg-primary px-6 pb-8 pt-16 text-primary-foreground">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* Official SANDIT logo (white variant on the dark screen) */}
        <SanditLogo variant="white" className="h-28 w-auto" />
        <p className="mt-4 text-balance text-lg text-primary-foreground/80">{BRAND.tagline}</p>
      </div>

      <div className="rounded-3xl bg-card p-5 text-right text-foreground">
        {/* Login / Sign-up toggle */}
        <div className="mb-4 flex rounded-2xl bg-muted p-1">
          {(
            [
              { key: "signup" as const, label: "הרשמה" },
              { key: "login" as const, label: "התחברות" },
            ]
          ).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => switchMode(o.key)}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
                mode === o.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <h2 className="mb-4 text-lg font-extrabold">{isSignup ? "הרשמה מהירה" : "כניסה לחשבון"}</h2>

        <div className="space-y-3">
          {isSignup ? (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם מלא"
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-right text-sm outline-none focus:border-primary"
              />
              <div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  inputMode="email"
                  placeholder="כתובת אימייל"
                  className={`w-full rounded-xl border bg-card px-3 py-3 text-right text-sm outline-none focus:border-primary ${
                    email && !emailValid ? "border-destructive" : "border-border"
                  }`}
                />
                {email && !emailValid && (
                  <p className="mt-1.5 text-xs font-semibold text-destructive">נא להזין כתובת אימייל תקינה.</p>
                )}
              </div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="tel"
                placeholder="מספר טלפון"
                className="w-full rounded-xl border border-border bg-card px-3 py-3 text-right text-sm outline-none focus:border-primary"
              />
            </>
          ) : (
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="מספר טלפון או כתובת אימייל"
              className="w-full rounded-xl border border-border bg-card px-3 py-3 text-right text-sm outline-none focus:border-primary"
            />
          )}

          <div>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit()
                }}
                type={showPassword ? "text" : "password"}
                placeholder="סיסמה"
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
            {isSignup && (
              <p
                className={`mt-1.5 text-xs font-semibold ${
                  password && !passwordValid ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                הסיסמה חייבת להכיל 8–15 תווים, ולשלב אותיות ומספרים.
              </p>
            )}
          </div>
        </div>

        {isSignup && (
          <div className="mt-4 space-y-3">
            {CHECKS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChecked((p) => ({ ...p, [c.id]: !p[c.id] }))}
                className="flex w-full items-start gap-2.5 text-right"
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    checked[c.id] ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                  }`}
                >
                  {checked[c.id] && <Check className="size-3.5" />}
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {c.label}
                  {"link" in c && c.link ? (
                    <>
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDoc(c.id)
                        }}
                        className="font-bold text-primary underline"
                      >
                        {c.link}
                      </span>
                      {c.suffix}
                    </>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        )}

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
          {submitting
            ? isSignup
              ? "יוצר חשבון…"
              : "מתחבר…"
            : isSignup
              ? "הרשמה וכניסה למערכת"
              : "התחברות"}
        </button>

        {/* Switch link */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? "כבר יש לך חשבון?" : "אין לך חשבון עדיין?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? "login" : "signup")}
            className="font-bold text-primary underline"
          >
            {isSignup ? "התחברות" : "הרשמה"}
          </button>
        </p>
      </div>

      <BottomSheet open={!!doc} onClose={() => setDoc(null)} title={doc ? LEGAL_DOCS[doc].title : ""}>
        <div className="space-y-4 text-right">
          {doc &&
            LEGAL_DOCS[doc].sections.map((section, i) => (
              <div key={i} className="space-y-1.5">
                {section.heading && (
                  <h4 className="text-sm font-extrabold text-foreground">{section.heading}</h4>
                )}
                {section.body.map((para, j) => (
                  <p key={j} className="text-sm leading-relaxed text-muted-foreground">
                    {para}
                  </p>
                ))}
              </div>
            ))}
        </div>
      </BottomSheet>
    </div>
  )
}
