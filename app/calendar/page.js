"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { materialLabel } from "@/components/MaterialBadge";

function ymd(date) {
  return date.toISOString().slice(0, 10);
}
function monthLabel(date) {
  return date.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

export default function CalendarPage() {
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const [cursor, setCursor] = useState(() => new Date());
  const [listings, setListings] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(ymd(new Date()));
  const [newEventTitle, setNewEventTitle] = useState("");

  useEffect(() => {
    load();
  }, [user?.id]);

  async function load() {
    const { data: listingRows } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "open")
      .or("available_until.not.is.null,deadline.not.is.null");
    setListings(listingRows || []);

    if (user) {
      const { data: eventRows } = await supabase.from("calendar_events").select("*").eq("user_id", user.id);
      setEvents(eventRows || []);
    }
  }

  const byDate = useMemo(() => {
    const map = {};
    for (const l of listings) {
      const d = l.available_until || l.deadline;
      if (!d) continue;
      (map[d] ||= { listings: [], events: [] }).listings.push(l);
    }
    for (const e of events) {
      (map[e.event_date] ||= { listings: [], events: [] }).events.push(e);
    }
    return map;
  }, [listings, events]);

  const monthDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay(); // Sunday-first grid, matches Hebrew week
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [cursor]);

  async function addEvent() {
    if (!user || !newEventTitle.trim()) return;
    const { data } = await supabase
      .from("calendar_events")
      .insert({ user_id: user.id, title: newEventTitle.trim(), event_date: selectedDate })
      .select()
      .single();
    if (data) setEvents((e) => [...e, data]);
    setNewEventTitle("");
  }

  const selected = byDate[selectedDate] || { listings: [], events: [] };

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl mb-4">לוח עסקאות</h1>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="btn-ghost">›</button>
          <span className="font-display font-bold">{monthLabel(cursor)}</span>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="btn-ghost">‹</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-forest/50 mb-1">
          {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((date, i) => {
            if (!date) return <div key={i} />;
            const key = ymd(date);
            const info = byDate[key];
            const isSelected = key === selectedDate;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 border
                  ${isSelected ? "bg-olive text-cream border-olive" : "bg-white border-sage-dark/30"}`}
              >
                <span>{date.getDate()}</span>
                {info && (
                  <span className="flex gap-0.5">
                    {info.listings.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-sage" />}
                    {info.events.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-olive-light" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="font-display font-bold mb-2">{selectedDate}</h2>

        {selected.listings.length === 0 && selected.events.length === 0 && (
          <p className="text-forest/50 text-sm">אין עסקאות או תזכורות ליום זה.</p>
        )}

        <div className="space-y-2">
          {selected.listings.map((l) => (
            <div key={l.id} className="card px-3 py-2.5 flex items-center gap-2 text-sm">
              <span className="chip bg-olive/10 text-olive">{l.type === "supply" ? "היצע" : "ביקוש"}</span>
              <span className="font-semibold">{materialLabel(l.material_type)}</span>
              <span className="text-forest/50">{l.quantity_cubic} קו״ב</span>
              <span className="text-forest/50">{l.location_text}</span>
            </div>
          ))}
          {selected.events.map((e) => (
            <div key={e.id} className="card px-3 py-2.5 flex items-center gap-2 text-sm">
              <span className="chip bg-sage/40 text-olive">תזכורת</span>
              <span className="font-semibold">{e.title}</span>
            </div>
          ))}
        </div>

        {user && (
          <div className="flex gap-2 mt-3">
            <input
              className="field-input"
              placeholder="הוסף תזכורת ליום זה"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
            />
            <button onClick={addEvent} className="btn-olive shrink-0">הוסף</button>
          </div>
        )}
      </div>
    </main>
  );
}
