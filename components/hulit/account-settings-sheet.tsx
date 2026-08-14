"use client"

import { Check, Loader2, Lock, Mail, Phone, User } from "lucide-react"
import { useEffect, useState } from "react"
import { updateAccount } from "@/lib/supabase/auth"
import type { UserRow } from "@/lib/supabase/types"
import { BottomSheet } from "./bottom-sheet"

export type AccountDetails = {
  name: string
  email: string
  phone: string
}

const FIELDS: {
  key: keyof AccountDetails | "password"
  label: string
  icon: typeof User
  type: string
  placeholder: string
  inputMode?: "text" | "email" | "tel"
}[] = [
  { key: "name", label: "שם מלא", icon: User, type: "text", placeholder: "שם מלא" },
  { key: "email", label: "כתובת אימייל", icon: Mail, type: "email", placeholder: "name@example.com", inputMode: "email" },
  { key: "phone", label: "מספר טלפון", icon: Phone, type: "tel", placeholder: "050-0000000", inputMode: "tel" },
  { key: "password", label: "סיסמה חדשה", icon: Lock, type: "password", placeholder: "השאר ריק לשמירת הסיסמה הנוכחית" },
]

export function AccountSettingsSheet({
  open,
  onClose,
  profileId,
  details,
  onSaved,
  onNotify,
}: {
  open: boolean
  onClose: () => void
  profileId: string
  details: AccountDetails
  onSaved: (next: UserRow) => void
  onNotify?: (msg: string) => void
}) {
  const [form, setForm] = useState<AccountDetails>(details)
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-seed from the live profile each time the sheet opens, so a cancelled
  // edit doesn't linger.
  useEffect(() => {
    if (open) {
      setForm(details)
      setPassword("")
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function set(key: keyof AccountDetails, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)

    const result = await updateAccount({
      profileId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      newPassword: password.trim() || undefined,
    })

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    onSaved(result.data)
    setPassword("")
    onNotify?.("פרטי החשבון עודכנו בהצלחה")
    onClose()
  }

  const valid = form.name.trim() && form.email.trim() && form.phone.trim()

  return (
    <BottomSheet open={open} onClose={onClose} title="הגדרות חשבון">
      <div className="space-y-4 text-right">
        {FIELDS.map((f) => {
          const Icon = f.icon
          const isPassword = f.key === "password"
          const value = isPassword ? password : form[f.key as keyof AccountDetails]
          return (
            <div key={f.key}>
              <label className="mb-1 flex items-center justify-end gap-1.5 text-sm font-bold text-foreground">
                {f.label}
                <Icon className="size-4 text-muted-foreground" />
              </label>
              <input
                type={f.type}
                inputMode={f.inputMode}
                value={value}
                onChange={(e) =>
                  isPassword ? setPassword(e.target.value) : set(f.key as keyof AccountDetails, e.target.value)
                }
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-right text-sm outline-none focus:border-primary"
              />
            </div>
          )
        })}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-bold leading-relaxed text-destructive"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!valid || saving}
          onClick={save}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? "שומר…" : "שמירת שינויים"}
        </button>
      </div>
    </BottomSheet>
  )
}
