"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { useRefetchOnFocus } from "@/lib/useRefetchOnFocus";
import Logo from "@/components/Logo";
import HomeMap from "@/components/HomeMap";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ onMap: 0, total: 0, inTalks: 0, todo: 0 });

  const loadStats = useCallback(async (u) => {
    const [{ count: onMap }, { count: total }, { count: inTalks }, { count: todo }] = await Promise.all([
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "open").not("latitude", "is", null),
      supabase.from("listings").select("*", { count: "exact", head: true }).eq("status", "open"),
      u
        ? supabase.from("listings").select("*", { count: "exact", head: true }).eq("user_id", u.id).eq("status", "inTalks")
        : Promise.resolve({ count: 0 }),
      u
        ? supabase
            .from("interest_events")
            .select("*, listings!inner(user_id)", { count: "exact", head: true })
            .eq("listings.user_id", u.id)
            .not("follow_up_sent_at", "is", null)
            .is("follow_up_status", null)
        : Promise.resolve({ count: 0 }),
    ]);
    setStats({ onMap: onMap || 0, total: total || 0, inTalks: inTalks || 0, todo: todo || 0 });
  }, []);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    loadStats(u);
  }, [loadStats]);

  useRefetchOnFocus(() => loadStats(user));

  const METRICS = [
    { label: "מודעות על המפה", value: stats.onMap, icon: "📍" },
    { label: "כל המודעות", value: stats.total, icon: "📋" },
    { label: "מודעות בתהליך", value: stats.inTalks, icon: "🚚" },
    { label: "משימות לביצוע", value: stats.todo, icon: "✅" },
  ];

  return (
    <main>
      {/* Header banner — dark olive, logo + greeting + bell */}
      <div className="bg-olive-night text-cream px-4 pt-6 pb-16 md:pb-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Logo size={38} light />
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="font-display font-bold text-lg">👋 שלום{user ? ` ${user.name}` : ""}</div>
              <div className="text-cream/60 text-xs">ברוך הבא למערכת</div>
            </div>
            <span className="text-xl">🔔</span>
          </div>
        </div>
      </div>

      {/* White panel, pulled up over the header */}
      <div className="max-w-xl mx-auto px-4 -mt-10 pb-6">
        <div className="bg-cream rounded-t-3xl pt-5">
          <h1 className="font-display font-black text-xl mb-3">מה קורה היום?</h1>

          <div className="grid grid-cols-2 gap-3">
            {METRICS.map((m) => (
              <div key={m.label} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-full bg-sage/30 flex items-center justify-center text-base">{m.icon}</span>
                  <span className="text-2xl font-black">{m.value}</span>
                </div>
                <div className="text-xs text-forest/60 mt-2">{m.label}</div>
                <div className="h-1 w-8 rounded-full bg-sage mt-2" />
              </div>
            ))}
          </div>

          {/* Two large action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <Link href="/demand" className="rounded-2xl bg-olive-night text-cream p-5 flex flex-col justify-between min-h-[150px] active:scale-[0.99] transition">
              <div>
                <div className="font-display font-black text-lg">אני צריך</div>
                <div className="text-cream/60 text-sm mt-0.5">פרסם איזה חומר אתה צריך</div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-3xl">📦</span>
                <span className="inline-flex items-center gap-1.5 bg-cream text-olive-night rounded-full px-3.5 py-2 text-sm font-bold">
                  חפש חומר ←
                </span>
              </div>
            </Link>

            <Link href="/supply" className="rounded-2xl bg-sage p-5 flex flex-col justify-between min-h-[150px] active:scale-[0.99] transition">
              <div>
                <div className="font-display font-black text-lg text-olive-night">יש לי לתת</div>
                <div className="text-forest/60 text-sm mt-0.5">פרסם חומר זמין</div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-3xl">🚚</span>
                <span className="inline-flex items-center gap-1.5 bg-olive-night text-cream rounded-full px-3.5 py-2 text-sm font-bold">
                  ⊕ פרסם חומר
                </span>
              </div>
            </Link>
          </div>

          {/* Map embedded directly in the home screen */}
          <div className="mt-5">
            <HomeMap />
          </div>
        </div>
      </div>
    </main>
  );
}
