"use client"

import { ChevronDown, FileText, LogOut, Settings, ShieldCheck, Star } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"
import { AccountSettingsSheet, type AccountDetails } from "./account-settings-sheet"
import { BRAND, type LegalSection, LEGAL_ABOUT, LEGAL_PRIVACY, LEGAL_TERMS } from "./data"
import { SanditLogo } from "./logo"

type LegalItem = { id: string; icon: typeof Star; title: string; sections: LegalSection[] }

const LEGAL: LegalItem[] = [
  {
    id: "about",
    icon: Star,
    title: `אודות ${BRAND.he}`,
    sections: [{ body: [LEGAL_ABOUT, BRAND.tagline] }],
  },
  { id: "terms", icon: FileText, title: "תנאי שימוש", sections: LEGAL_TERMS },
  { id: "privacy", icon: ShieldCheck, title: "מדיניות פרטיות", sections: LEGAL_PRIVACY },
]

function Accordion({ item }: { item: LegalItem }) {
  const [open, setOpen] = useState(false)
  const Icon = item.icon
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-right"
      >
        <ChevronDown className={`size-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          {item.title}
          <span className="flex size-8 items-center justify-center rounded-full bg-sage-soft text-primary">
            <Icon className="size-4" />
          </span>
        </span>
      </button>
      {open && (
        <div className="max-h-[55vh] space-y-4 overflow-y-auto border-t border-border px-4 py-3 text-right">
          {item.sections.map((section, i) => (
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
      )}
    </div>
  )
}

export function ProfileScreen({ onNotify }: { onNotify?: (msg: string) => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { profile, setProfile } = useAuth()
  const [stats, setStats] = useState<{ total: number; closed: number } | null>(null)

  const account: AccountDetails = {
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  }

  // Real counts off the user's own listings. Moves into the shared listings
  // data layer once that lands.
  useEffect(() => {
    if (!profile) return
    let active = true
    async function load(userId: string) {
      const [all, closed] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "closed"),
      ])
      if (active) setStats({ total: all.count ?? 0, closed: closed.count ?? 0 })
    }
    load(profile.id)
    return () => {
      active = false
    }
  }, [profile])

  return (
    <div className="space-y-6 px-5 py-6">
      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-primary p-6 text-center text-primary-foreground">
        <span className="flex h-14 items-center justify-center rounded-2xl bg-white/10 px-4">
          <SanditLogo variant="white" className="h-9 w-auto" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold">{account.name}</h2>
          <p className="text-sm text-primary-foreground/70" dir="ltr">
            {account.phone}
          </p>
        </div>
        <div className="flex w-full justify-around border-t border-white/10 pt-3 text-center">
          <div>
            <p className="text-lg font-extrabold">{stats ? stats.total : "…"}</p>
            <p className="text-xs text-primary-foreground/70">מודעות</p>
          </div>
          <div>
            <p className="text-lg font-extrabold">{stats ? stats.closed : "…"}</p>
            <p className="text-xs text-primary-foreground/70">עסקאות</p>
          </div>
          {/* The דירוג tile was removed: no ratings data exists anywhere, and a
              blank tile is worse than no tile. See supabase/GAPS.md. */}
        </div>
      </div>

      {/* Settings list */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3.5 text-right shadow-sm"
        >
          <ChevronDown className="size-5 -rotate-90 text-muted-foreground" />
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            הגדרות חשבון
            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
              <Settings className="size-4" />
            </span>
          </span>
        </button>
      </div>

      {/* Legal accordion */}
      <div className="space-y-2">
        <h3 className="text-right text-base font-extrabold text-foreground">אודות ומידע משפטי</h3>
        {LEGAL.map((item) => (
          <Accordion key={item.id} item={item} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => signOut()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 py-3 text-sm font-bold text-destructive"
      >
        <LogOut className="size-4" /> התנתקות
      </button>

      {profile && (
        <AccountSettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          profileId={profile.id}
          details={account}
          onSaved={setProfile}
          onNotify={onNotify}
        />
      )}
    </div>
  )
}
