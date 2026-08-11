"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabaseClient";
import { materialLabel } from "@/components/MaterialBadge";
import { URGENCY_LABELS, formatPrice, waLink } from "@/lib/format";
import { haversineKm } from "@/lib/matching";
import { useFilters } from "@/contexts/FilterContext";
import { useRefetchOnFocus } from "@/lib/useRefetchOnFocus";
import FilterBar from "@/components/FilterBar";

const CENTER_ISRAEL = [32.08, 34.9];

// Item 11: a floating, touch-friendly recenter button that never sits
// under the bottom nav or top content.
function RecenterButton({ target }) {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => target && map.setView([target.lat, target.lng], 12)}
      className="absolute bottom-4 left-4 z-[1000] w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center text-lg border border-sage-dark/30"
      aria-label="מרכז למיקום שלי"
    >
      📍
    </button>
  );
}

export default function MapClient() {
  const { filters, updateFilter } = useFilters();
  const [listings, setListings] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "open")
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    setListings(data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRefetchOnFocus(load);

  function locateMe() {
    navigator.geolocation?.getCurrentPosition((pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
  }

  const filtered = useMemo(() => {
    let list = listings;
    if (filters.type !== "all") list = list.filter((l) => l.type === filters.type);
    if (filters.material !== "all") list = list.filter((l) => l.material_type === filters.material);
    if (filters.priceType !== "all") list = list.filter((l) => l.price_type === filters.priceType);
    if (filters.transport !== "all") list = list.filter((l) => l.transport === filters.transport);
    if (filters.loading !== "all") {
      const wantsLoading = filters.loading === "yes";
      list = list.filter((l) => !!l.has_loading === wantsLoading);
    }

    let withDist = list.map((l) => ({
      ...l,
      _dist: myLocation ? haversineKm(myLocation.lat, myLocation.lng, l.latitude, l.longitude) : null,
    }));
    if (filters.radiusKm !== "all" && myLocation) {
      const r = Number(filters.radiusKm);
      withDist = withDist.filter((l) => l._dist == null || l._dist <= r);
    }
    return withDist;
  }, [listings, filters, myLocation]);

  return (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-black text-2xl">מפת עסקאות</h1>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-sage-dark/60 bg-white"
        >
          {showFilters ? "הסתר סינון" : "סינון"}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4">
          <FilterBar onLocateMe={locateMe} locating={!!myLocation} />
        </div>
      )}

      <div className="card overflow-hidden relative" style={{ height: 460 }}>
        <MapContainer center={myLocation ? [myLocation.lat, myLocation.lng] : CENTER_ISRAEL} zoom={myLocation ? 11 : 9} style={{ height: "100%", width: "100%" }}>
          {/* Item 8: clean minimal "vector-style" basemap (CartoDB Positron) instead of a busy raster map */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {filtered.map((l) => (
            <CircleMarker
              key={l.id}
              center={[l.latitude, l.longitude]}
              radius={9}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: l.type === "supply" ? "#B2D8A2" : "#3A523D",
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div style={{ direction: "rtl", minWidth: 190, fontFamily: "inherit" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {l.type === "supply" ? "היצע" : "ביקוש"} · {materialLabel(l.material_type)}
                  </div>
                  <div>כמות: {l.quantity_cubic} קו״ב</div>
                  <div>מיקום: {l.location_text}</div>
                  <div>מועד: {URGENCY_LABELS[l.urgency]}</div>
                  <div>מחיר: {formatPrice(l)}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                    <a href={`tel:${l.contact_phone}`}>📞 התקשר</a>
                    <a href={waLink(l.contact_phone, "שלום, ראיתי את הפרסום שלך במפה בסאנדיט.")} target="_blank" rel="noreferrer">
                      💬 וואטסאפ
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          <RecenterButton target={myLocation} />
        </MapContainer>
      </div>
      <p className="text-xs text-forest/40 mt-2">● בהיר = היצע &nbsp; ● כהה = ביקוש</p>
    </main>
  );
}
