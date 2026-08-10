"use client";

import dynamic from "next/dynamic";

const HomeMapClient = dynamic(() => import("./HomeMapClient"), {
  ssr: false,
  loading: () => (
    <div className="card overflow-hidden" style={{ height: 280 }}>
      <div className="w-full h-full flex items-center justify-center text-forest/40 text-sm">טוען מפה…</div>
    </div>
  ),
});

export default function HomeMap() {
  return <HomeMapClient />;
}
