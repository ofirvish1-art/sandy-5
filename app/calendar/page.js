"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { materialLabel } from "@/components/MaterialBadge";

const CATEGORIES = [
  { value: "site", label: "עבודות אתר", color: "bg-supply-dot", dot: "#2F9C5A" },
  { value: "inspection", label: "פיקוח", color: "bg-blue-dot", dot: "#3B82F6" },
  { value: "delivery", label: "אספקה", color: "bg-yellow-dot", dot: "#E3B341" },
];
const categoryColor = (v) => CATEGORIES.find((c) => c.value === v)?.dot || "#4A6B4E";
const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || "תזכורת";

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
  const [newEventCategory, setNewEventCategory] = useState("site");
  const [showAddForm, setShowAddForm] = useState(false);

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
    const startOffset = first.getDay();
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
      .insert({ user_id: user.id, title: newEventTitle.trim(), event_date: selectedDate, category: newEventCategory })
      .select()
      .single();
    if (data) setEvents((e) => [...e, data]);
    setNewEventTitle("");
    setShowAddForm(false);
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
                    {info.listings.length > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#B2D8A2" }} />}
                    {info.events.map((e, idx) => (
                      <span key={idx} className="w-1.5 h-1.5 rounded-full" style={{ background: categoryColor(e.category) }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-forest/50">
        {CATEGORIES.map((c) => (
          <span key={c.value} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
            {c.label}
          </span>
        ))}
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
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: categoryColor(e.category) }} />
              <span className="chip bg-sage/40 text-olive">{categoryLabel(e.category)}</span>
              <span className="font-semibold">{e.title}</span>
            </div>
          ))}
        </div>

        {user && !showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-secondary w-full mt-3">
            + הוסף אירוע
          </button>
        )}

        {user && showAddForm && (
          <div className="card p-3 mt-3 space-y-2">
            <input
              className="field-input"
              placeholder="לדוגמה: פיקוח הנדסאי, תחילת חפירה באתר א׳"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewEventCategory(c.value)}
                  className={`text-xs px-2 py-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 ${
                    newEventCategory === c.value ? "border-olive bg-olive/5" : "border-sage-dark/40"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">ביטול</button>
              <button onClick={addEvent} className="btn-olive flex-1">שמור</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
