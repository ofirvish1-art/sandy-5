"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabaseClient";
import { materialLabel } from "@/components/MaterialBadge";
import { URGENCY_LABELS, formatPrice, waLink } from "@/lib/format";
import { haversineKm } from "@/lib/matching";

const CENTER_ISRAEL = [32.08, 34.9]; // roughly Petah Tikva / central Israel

export default function MapClient() {
  const [listings, setListings] = useState([]);
  const [typeFilter, setTypeFilter] = useState("both"); // both | supply | demand
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "open")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      setListings(data || []);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = listings;
    if (typeFilter !== "both") list = list.filter((l) => l.type === typeFilter);
    if (myLocation) {
      list = list
        .map((l) => ({
          ...l,
          _dist: haversineKm(myLocation.lat, myLocation.lng, l.latitude, l.longitude),
        }))
        .filter((l) => l._dist == null || l._dist <= 50)
        .sort((a, b) => (a._dist ?? 0) - (b._dist ?? 0));
    }
    return list;
  }, [listings, typeFilter, myLocation]);

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl">מפת עסקאות</h1>
      <div className="hazard-rule my-4" />

      <div className="flex gap-2 flex-wrap mb-3">
        {[
          ["both", "שניהם"],
          ["supply", "רק היצע"],
          ["demand", "רק ביקוש"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTypeFilter(v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
              typeFilter === v ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-200"
            }`}
          >
            {l}
          </button>
        ))}
        <button
          onClick={() =>
            navigator.geolocation?.getCurrentPosition((pos) =>
              setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            )
          }
          className="text-xs px-3 py-1.5 rounded-lg border font-semibold bg-brand-500 text-white border-brand-500"
        >
          📍 מצא קרובים אליי
        </button>
      </div>

      <div className="card overflow-hidden" style={{ height: 420 }}>
        <MapContainer
          center={myLocation ? [myLocation.lat, myLocation.lng] : CENTER_ISRAEL}
          zoom={myLocation ? 11 : 9}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map((l) => (
            <CircleMarker
              key={l.id}
              center={[l.latitude, l.longitude]}
              radius={9}
              pathOptions={{
                color: l.type === "supply" ? "#2F9C5A" : "#D9480F",
                fillColor: l.type === "supply" ? "#2F9C5A" : "#D9480F",
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div style={{ direction: "rtl", minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>
                    {l.type === "supply" ? "היצע" : "ביקוש"} · {materialLabel(l.material_type)}
                  </div>
                  <div>כמות: {l.quantity_cubic} קוב</div>
                  <div>מיקום: {l.location_text}</div>
                  <div>זמין: {URGENCY_LABELS[l.urgency]}</div>
                  <div>מחיר: {formatPrice(l)}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                    <a href={`tel:${l.contact_phone}`}>📞 התקשר</a>
                    <a href={waLink(l.contact_phone, "שלום, ראיתי את הפרסום שלך במפה.")} target="_blank" rel="noreferrer">
                      💬 וואטסאפ
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="text-xs text-stone-400 mt-2">
        ● ירוק = היצע &nbsp; ● כתום = ביקוש
      </p>
    </main>
  );
}
