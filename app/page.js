"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, MessageCircle, Layers, MapPin, ListTodo, ClipboardCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { useRefetchOnFocus } from "@/lib/useRefetchOnFocus";
import { useWizard } from "@/contexts/WizardContext";
import Logo from "@/components/Logo";
import Hourglass from "@/components/Hourglass";
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
  const { openWizard } = useWizard();

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
    { label: "מודעות על המפה", value: stats.onMap, Icon: MapPin },
    { label: "כל המודעות", value: stats.total, Icon: Layers },
    { label: "מודעות בתהליך", value: stats.inTalks, Icon: ClipboardCheck },
    { label: "משימות לביצוע", value: stats.todo, Icon: ListTodo },
  ];

  return (
    <main>
      {/* Header banner */}
      <div className="bg-olive-night text-cream mx-3 mt-3 px-4 py-4 rounded-3xl md:mx-auto md:max-w-xl md:mt-4">
        <div className="flex items-center justify-between">
          <Logo size={34} light />
          <div className="text-center flex-1 px-2">
            <div className="font-display font-bold text-base leading-tight">👋 שלום{user ? ` ${user.name}` : ""}</div>
            <div className="text-cream/60 text-[11px] mt-0.5">יש עפר? צריך עפר? נפגשים בסאנדיט.</div>
          </div>
          <div className="flex items-center gap-2.5 text-sage">
            <Hourglass size={18} />
            <Link href="/calendar" aria-label="התראות" className="relative">
              <Bell size={18} />
              {stats.todo > 0 && (
                <span className="absolute -top-1 -end-1 w-2 h-2 rounded-full bg-demand" />
              )}
            </Link>
            {/* Item 9: feedback/review icon */}
            <button onClick={() => setFeedbackOpen(true)} aria-label="שלח משוב">
              <MessageCircle size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-6">
        <div className="bg-cream pt-4">
          <h1 className="font-display font-black text-lg mb-2.5">מה קורה היום?</h1>

          <div className="grid grid-cols-4 gap-1.5">
            {METRICS.map((m) => (
              <div key={m.label} className="card p-2 flex flex-col items-center text-center">
                <span className="w-7 h-7 rounded-full bg-sage/30 flex items-center justify-center text-olive shrink-0">
                  <m.Icon size={14} strokeWidth={2.25} />
                </span>
                <span className="text-base font-black mt-1">{m.value}</span>
                <div className="text-[9px] leading-tight text-forest/60 mt-0.5">{m.label}</div>
                <div className="h-0.5 w-4 rounded-full bg-sage mt-1" />
              </div>
            ))}
          </div>

          {/* Hero action cards — real photography, dark overlay, title,
              description, CTA. Item 1 + 2 in the "11 updates" spec.
              Item 13: kept short so the map below stays fully visible. */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            {/* Item 2: instant trigger — opens the wizard as a bottom sheet, no navigation. */}
            <button
              type="button"
              onClick={() => openWizard("demand")}
              className="relative rounded-2xl overflow-hidden shadow-lg h-24 group active:scale-[0.99] transition text-right"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DEMAND_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover group-active:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
              <div className="relative z-10 h-full flex flex-col justify-end p-3 text-white">
                <div className="font-display font-black text-sm drop-shadow">אני צריך</div>
                <span className="text-[10px] text-white/85 mt-0.5">חפש חומר ←</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => openWizard("supply")}
              className="relative rounded-2xl overflow-hidden shadow-lg h-24 group active:scale-[0.99] transition text-right"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SUPPLY_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover group-active:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
              <div className="relative z-10 h-full flex flex-col justify-end p-3 text-white">
                <div className="font-display font-black text-sm drop-shadow">יש לי לתת</div>
                <span className="text-[10px] text-white/85 mt-0.5">⊕ פרסם חומר</span>
              </div>
            </button>
          </div>

          {/* Map — maximized so it's fully visible without scrolling. */}
          <div className="mt-3">
            <HomeMap />
          </div>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </main>
  );
}
