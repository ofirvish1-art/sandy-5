"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabaseClient";

const CENTER_ISRAEL = [32.08, 34.9];

function RecenterButton({ target }) {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => target && map.setView([target.lat, target.lng], 12)}
      className="absolute bottom-3 left-3 z-[1000] w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-base border border-sage-dark/30"
      aria-label="מרכז למיקום שלי"
    >
      🎯
    </button>
  );
}

// The map embedded directly on the home dashboard (item 2 in the redesign
// spec) — read-only preview with a locate-me button; the sliders icon
// links out to the full /map screen with filters.
export default function HomeMapClient() {
  const [listings, setListings] = useState([]);
  const [myLocation, setMyLocation] = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("id, type, latitude, longitude")
        .eq("status", "open")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      setListings(data || []);
    }
    load();
  }, []);

  return (
    <div className="card overflow-hidden relative" style={{ height: 280 }}>
      <MapContainer center={myLocation ? [myLocation.lat, myLocation.lng] : CENTER_ISRAEL} zoom={myLocation ? 11 : 8} zoomControl={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {listings.map((l) => (
          <CircleMarker
            key={l.id}
            center={[l.latitude, l.longitude]}
            radius={7}
            pathOptions={{ color: "#fff", weight: 2, fillColor: l.type === "supply" ? "#B2D8A2" : "#C0392B", fillOpacity: 1 }}
          />
        ))}
        <RecenterButton target={myLocation} />
      </MapContainer>

      <Link
        href="/map"
        className="absolute top-3 left-3 z-[1000] w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-base border border-sage-dark/30"
        aria-label="סינון ומפה מלאה"
      >
        🎚️
      </Link>
      <button
        type="button"
        onClick={() => navigator.geolocation?.getCurrentPosition((p) => setMyLocation({ lat: p.coords.latitude, lng: p.coords.longitude }))}
        className="absolute top-3 right-3 z-[1000] w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-base border border-sage-dark/30"
        aria-label="השתמש במיקום שלי"
      >
        📍
      </button>
    </div>
  );
}
