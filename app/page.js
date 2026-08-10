"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { useRefetchOnFocus } from "@/lib/useRefetchOnFocus";
import Logo from "@/components/Logo";
import HomeMap from "@/components/HomeMap";
import FeedbackModal from "@/components/FeedbackModal";

// Real, freely-licensed photography (Unsplash License — free for
// commercial use). See app note in chat for sourcing details.
const SUPPLY_PHOTO =
  "https://images.unsplash.com/photo-1746349086423-06ea6b4d73f7?fm=jpg&q=70&w=1200&auto=format&fit=crop";
const DEMAND_PHOTO =
  "https://images.unsplash.com/photo-1645736315000-6f788915923b?fm=jpg&q=70&w=1200&auto=format&fit=crop";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ onMap: 0, total: 0, inTalks: 0, todo: 0 });
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
      {/* Header banner */}
      <div className="bg-olive-night text-cream px-4 pt-6 pb-16 md:pb-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Logo size={38} light />
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="font-display font-bold text-lg">👋 שלום{user ? ` ${user.name}` : ""}</div>
              <div className="text-cream/60 text-xs">ברוך הבא למערכת</div>
            </div>
            {/* Item 9: feedback/review icon */}
            <button onClick={() => setFeedbackOpen(true)} aria-label="שלח משוב" className="text-xl">
              💬
            </button>
          </div>
        </div>
      </div>

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

          {/* Hero action cards — real photography, dark overlay, title,
              description, CTA. Item 1 + 2 in the "11 updates" spec. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <Link
              href="/demand"
              className="relative rounded-3xl overflow-hidden shadow-xl min-h-[220px] group active:scale-[0.99] transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEMAND_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover group-active:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />
              <div className="relative z-10 h-full flex flex-col justify-end p-5 text-white">
                <div className="font-display font-black text-2xl drop-shadow">אני צריך</div>
                <div className="text-white/80 text-sm mt-1">פרסם איזה חומר אתה צריך</div>
                <span className="inline-flex items-center gap-1.5 bg-white text-olive-night rounded-full px-4 py-2 text-sm font-bold mt-4 w-fit">
                  חפש חומר ←
                </span>
              </div>
            </Link>

            <Link
              href="/supply"
              className="relative rounded-3xl overflow-hidden shadow-xl min-h-[220px] group active:scale-[0.99] transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SUPPLY_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover group-active:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />
              <div className="relative z-10 h-full flex flex-col justify-end p-5 text-white">
                <div className="font-display font-black text-2xl drop-shadow">יש לי לתת</div>
                <div className="text-white/80 text-sm mt-1">פרסם חומר זמין</div>
                <span className="inline-flex items-center gap-1.5 bg-sage text-olive-night rounded-full px-4 py-2 text-sm font-bold mt-4 w-fit">
                  ⊕ פרסם חומר
                </span>
              </div>
            </Link>
          </div>

          {/* Map — the center of the experience, ~38% of viewport height */}
          <div className="mt-5">
            <HomeMap />
          </div>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </main>
  );
}
