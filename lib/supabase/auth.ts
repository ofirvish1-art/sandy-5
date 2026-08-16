// Real Supabase Auth for SANDIT.
//
// The screen lets people log in with "phone OR email", but Supabase only
// signs in by email — so a phone identifier is resolved to its account
// email via public.users first.
//
// Every account has two halves that must stay in sync:
//   auth.users   — credentials, owned by Supabase
//   public.users — the profile everything else (listings, calendar,
//                  feedback) points at, linked by auth_user_id
//
// All user-facing strings are Hebrew; Supabase's own English error
// messages are translated in toHebrewAuthError().

import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "./client"
import type { UserRow } from "./types"

// `ok` is the discriminant: narrowing on `error` alone doesn't work, because
// `string` is not a unit type and an empty string would be falsy.
export type AuthResult<T> = { ok: true; data: T; error: null } | { ok: false; data: null; error: string }

function fail(error: string): { ok: false; data: null; error: string } {
  return { ok: false, data: null, error }
}

function succeed<T>(data: T): { ok: true; data: T; error: null } {
  return { ok: true, data, error: null }
}

/** Digits only, so "050-123 4567" and "0501234567" are the same person. */
export function normalisePhone(input: string): string {
  return input.replace(/\D/g, "")
}

export function isEmailIdentifier(input: string): boolean {
  return input.includes("@")
}

function toHebrewAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) return "פרטי ההתחברות שגויים. בדוק את הסיסמה ונסה שוב."
  if (m.includes("email not confirmed")) return "החשבון טרם אומת. בדוק את תיבת המייל שלך ולחץ על קישור האימות."
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "כתובת האימייל הזו כבר רשומה במערכת. עבור למסך ההתחברות."
  if (m.includes("password should be at least")) return "הסיסמה קצרה מדי."
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "יותר מדי ניסיונות. המתן רגע ונסה שוב."
  if (m.includes("failed to fetch") || m.includes("network"))
    return "אין חיבור לשרת. בדוק את החיבור לאינטרנט ונסה שוב."
  return "אירעה שגיאה. נסה שוב."
}

/* -------------------------------------------------------------------------- */
/*  Profile                                                                   */
/* -------------------------------------------------------------------------- */

/** The public.users row belonging to a signed-in auth account. */
export async function fetchProfile(authUserId: string): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (error) {
    console.error("fetchProfile failed", error)
    return null
  }
  return data
}

/* -------------------------------------------------------------------------- */
/*  Sign up                                                                   */
/* -------------------------------------------------------------------------- */

export type SignUpInput = {
  name: string
  email: string
  phone: string
  password: string
  /** All three consent checkboxes on the sign-up screen. */
  consents: { terms: boolean; privacy: boolean; whatsapp: boolean }
}

export async function signUp(input: SignUpInput): Promise<AuthResult<{ user: User; profile: UserRow }>> {
  const email = input.email.trim().toLowerCase()
  const phone = normalisePhone(input.phone)
  const name = input.name.trim()

  // A duplicate phone would fail the unique index on public.users only
  // AFTER the auth account was already created, leaving an account with
  // no profile. Check first so the user gets a clean, fixable message.
  const { data: existingPhone, error: phoneLookupError } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle()

  if (phoneLookupError) {
    console.error("phone lookup failed", phoneLookupError)
    return fail("לא הצלחנו לבדוק את מספר הטלפון. נסה שוב.")
  }
  if (existingPhone) {
    return fail("מספר הטלפון הזה כבר רשום במערכת. עבור למסך ההתחברות.")
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { name, phone } },
  })

  if (signUpError) return fail(toHebrewAuthError(signUpError.message))
  if (!signUpData.user) return fail("יצירת החשבון נכשלה. נסה שוב.")

  // No session means "Confirm email" is still enabled in the Supabase
  // dashboard. The account exists but cannot be used yet — say so plainly
  // instead of dropping the user into a half-working app.
  if (!signUpData.session) {
    return fail("החשבון נוצר, אך נדרש אימות במייל לפני הכניסה. בדוק את תיבת הדואר שלך.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .insert({
      auth_user_id: signUpData.user.id,
      name,
      phone,
      email,
      consent_terms: input.consents.terms,
      consent_privacy: input.consents.privacy,
      consent_contact_disclosure: input.consents.terms,
      consent_whatsapp_operational: input.consents.whatsapp,
      consented_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (profileError || !profile) {
    console.error("profile insert failed", profileError)
    // Don't leave the person logged into an account with no profile.
    await supabase.auth.signOut()
    return fail("החשבון נוצר אך שמירת הפרטים נכשלה. נסה להירשם שוב.")
  }

  return succeed({ user: signUpData.user, profile })
}

/* -------------------------------------------------------------------------- */
/*  Sign in                                                                   */
/* -------------------------------------------------------------------------- */

/** `identifier` is whatever was typed: an email address or a phone number. */
export async function signIn(identifier: string, password: string): Promise<AuthResult<Session>> {
  const raw = identifier.trim()
  let email = raw.toLowerCase()

  if (!isEmailIdentifier(raw)) {
    const phone = normalisePhone(raw)
    const { data: row, error } = await supabase
      .from("users")
      .select("email")
      .eq("phone", phone)
      .not("auth_user_id", "is", null)
      .maybeSingle()

    if (error) {
      console.error("phone->email lookup failed", error)
      return fail("לא הצלחנו לאתר את החשבון. נסה שוב.")
    }
    if (!row?.email) {
      return fail("לא נמצא חשבון עם מספר הטלפון הזה. נסה להתחבר עם האימייל או להירשם.")
    }
    email = row.email.toLowerCase()
  }

  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return fail(toHebrewAuthError(signInError.message))
  if (!data.session) return fail("ההתחברות נכשלה. נסה שוב.")

  return succeed(data.session)
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/* -------------------------------------------------------------------------- */
/*  Password reset                                                            */
/* -------------------------------------------------------------------------- */

/** "yuval@gmail.com" → "yu***@gmail.com" — enough to recognise, not to harvest. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email
  const head = local.slice(0, 2)
  return `${head}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`
}

/**
 * Sends Supabase's built-in reset email.
 *
 * Login accepts a phone number, so people will type one here too. A phone is
 * resolved to the account's email and the link goes there — but an account
 * with no email cannot be recovered this way at all, and says so plainly
 * rather than pretending something was sent. SMS reset needs a provider that
 * isn't set up yet.
 */
export async function requestPasswordReset(
  identifier: string,
): Promise<AuthResult<{ sentTo: string }>> {
  const raw = identifier.trim()
  if (!raw) return fail("יש להזין כתובת אימייל או מספר טלפון.")

  let email = raw.toLowerCase()

  if (!isEmailIdentifier(raw)) {
    const phone = normalisePhone(raw)
    const { data: row, error } = await supabase
      .from("users")
      .select("email")
      .eq("phone", phone)
      .not("auth_user_id", "is", null)
      .maybeSingle()

    if (error) {
      console.error("phone->email lookup failed", error)
      return fail("לא הצלחנו לאתר את החשבון. נסה שוב.")
    }
    if (!row) {
      return fail("לא נמצא חשבון עם מספר הטלפון הזה.")
    }
    if (!row.email) {
      return fail(
        "לחשבון הזה רשום מספר טלפון בלבד, ואיפוס סיסמה ב‑SMS עדיין לא זמין. פנה אלינו כדי לשחזר את החשבון.",
      )
    }
    email = row.email.toLowerCase()
  }

  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) return fail(toHebrewAuthError(error.message))

  return succeed({ sentTo: maskEmail(email) })
}

/** Sets a new password for the session created by the recovery link. */
export async function updatePassword(newPassword: string): Promise<AuthResult<true>> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return fail(toHebrewAuthError(error.message))
  return succeed(true as const)
}

/* -------------------------------------------------------------------------- */
/*  Account settings                                                          */
/* -------------------------------------------------------------------------- */

export type UpdateAccountInput = {
  profileId: string
  name: string
  email: string
  phone: string
  /** Blank means "keep the current password". */
  newPassword?: string
}

export async function updateAccount(input: UpdateAccountInput): Promise<AuthResult<UserRow>> {
  const email = input.email.trim().toLowerCase()
  const phone = normalisePhone(input.phone)

  // Email and password live on the auth account, not the profile row.
  const authPatch: { email?: string; password?: string } = {}
  if (input.newPassword) authPatch.password = input.newPassword

  const { data: sessionData } = await supabase.auth.getUser()
  if (sessionData.user && sessionData.user.email?.toLowerCase() !== email) {
    authPatch.email = email
  }

  if (Object.keys(authPatch).length > 0) {
    const { error } = await supabase.auth.updateUser(authPatch)
    if (error) return fail(toHebrewAuthError(error.message))
  }

  const { data, error } = await supabase
    .from("users")
    .update({ name: input.name.trim(), email, phone })
    .eq("id", input.profileId)
    .select()
    .single()

  if (error || !data) {
    console.error("profile update failed", error)
    if (error?.code === "23505") {
      return fail("מספר הטלפון הזה כבר רשום למשתמש אחר.")
    }
    return fail("שמירת הפרטים נכשלה. נסה שוב.")
  }

  return succeed(data)
}
