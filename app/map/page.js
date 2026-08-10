"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so it can only render on the client.
const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <main className="max-w-xl mx-auto px-4 pt-8 pb-6">
      <h1 className="font-display font-black text-2xl">מפת עסקאות</h1>
      <p className="text-forest/50">טוען מפה…</p>
    </main>
  ),
});

export default function MapPage() {
  return <MapClient />;
}
