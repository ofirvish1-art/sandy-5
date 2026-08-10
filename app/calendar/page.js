"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getStoredUser } from "@/lib/session";
import { useRefetchOnFocus } from "@/lib/useRefetchOnFocus";
import { materialLabel } from "@/components/MaterialBadge";

// Item 5: auto-populated items are colored by type — supply green, demand
// red. Custom events get a user-picked color + free-text label instead of
// a fixed category list.
const SUPPLY_COLOR = "#B2D8A2";
const DEMAND_COLOR = "#C0392B";
const COLOR_SWATCHES = ["#4A6B4E", "#3B82F6", "#E3B341", "#C0392B", "#8B5CF6", "#EC4899"];

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", color: COLOR_SWATCHES[0], reminderTime: "" });

  const load = useCallback(async () => {
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
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);
  useRefetchOnFocus(load);

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
    if (!user || !newEvent.title.trim()) return;
    const reminderAt = newEvent.reminderTime ? `${selectedDate}T${newEvent.reminderTime}:00` : null;
    const { data } = await supabase
      .from("calendar_events")
      .insert({
        user_id: user.id,
        title: newEvent.title.trim(),
        event_date: selectedDate,
        color: newEvent.color,
        reminder_at: reminderAt,
      })
      .select()
      .single();
    if (data) setEvents((e) => [...e, data]);
    setNewEvent({ title: "", color: COLOR_SWATCHES[0], reminderTime: "" });
    setShowAddForm(false);
  }

  const selected = byDate[selectedDate] || { listings: [], events: [] };

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl mb-4">יומן</h1>

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
                  <span className="flex gap-0.5 flex-wrap justify-center max-w-full">
                    {info.listings.map((l, idx) => (
                      <span key={idx} className="w-1.5 h-1.5 rounded-full" style={{ background: l.type === "supply" ? SUPPLY_COLOR : DEMAND_COLOR }} />
                    ))}
                    {info.events.map((e, idx) => (
                      <span key={idx} className="w-1.5 h-1.5 rounded-full" style={{ background: e.color || COLOR_SWATCHES[0] }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-forest/50">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: SUPPLY_COLOR }} />היצע</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: DEMAND_COLOR }} />ביקוש</span>
      </div>

      <div className="mt-5">
        <h2 className="font-display font-bold mb-2">{selectedDate}</h2>

        {selected.listings.length === 0 && selected.events.length === 0 && (
          <p className="text-forest/50 text-sm">אין עסקאות או תזכורות ליום זה.</p>
        )}

        <div className="space-y-2">
          {selected.listings.map((l) => (
            <div key={l.id} className="card px-3 py-2.5 flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.type === "supply" ? SUPPLY_COLOR : DEMAND_COLOR }} />
              <span className="chip bg-olive/10 text-olive">{l.type === "supply" ? "היצע" : "ביקוש"}</span>
              <span className="font-semibold">{materialLabel(l.material_type)}</span>
              <span className="text-forest/50">{l.quantity_cubic} קו״ב</span>
              <span className="text-forest/50">{l.location_text}</span>
            </div>
          ))}
          {selected.events.map((e) => (
            <div key={e.id} className="card px-3 py-2.5 flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color || COLOR_SWATCHES[0] }} />
              <span className="font-semibold">{e.title}</span>
              {e.reminder_at && <span className="text-xs text-forest/40 ms-auto">🔔 תזכורת בוואטסאפ</span>}
            </div>
          ))}
        </div>

        {user && !showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-secondary w-full mt-3">
            + הוספת אירוע
          </button>
        )}

        {user && showAddForm && (
          <div className="card p-3 mt-3 space-y-3">
            <input
              className="field-input"
              placeholder="לדוגמה: בדיקת מהנדס, עבודות אתר"
              value={newEvent.title}
              onChange={(e) => setNewEvent((f) => ({ ...f, title: e.target.value }))}
            />
            <div>
              <label className="field-label">צבע</label>
              <div className="flex gap-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewEvent((f) => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 ${newEvent.color === c ? "border-forest" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">תזכורת בוואטסאפ (רשות)</label>
              <input
                className="field-input"
                type="time"
                value={newEvent.reminderTime}
                onChange={(e) => setNewEvent((f) => ({ ...f, reminderTime: e.target.value }))}
              />
              <p className="text-xs text-forest/40 mt-1">
                אם תבחר שעה, תישלח הודעת וואטסאפ תזכורת בשעה הזו ביום {selectedDate}.
              </p>
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
