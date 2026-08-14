"use client"

import "leaflet/dist/leaflet.css"
import type { Map as LeafletMap, LayerGroup } from "leaflet"
import { Crosshair, SlidersHorizontal } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { type Listing, type MapPin } from "./data"

// Fallback view when we have neither a device position nor any mapped listing:
// central Israel, wide enough to show the whole service area.
const FALLBACK_CENTER = { lat: 31.9315, lng: 34.8047 }
const FALLBACK_ZOOM = 9

// Lucide "package" icon path, inlined so it can live inside a Leaflet div-icon.
const PACKAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/></svg>`

export function MapView({
  className = "",
  rounded = "rounded-3xl",
  onOpenFilter,
  onSelectListing,
  pins,
  myLocation = null,
}: {
  className?: string
  rounded?: string
  onOpenFilter?: () => void
  onSelectListing?: (l: Listing) => void
  pins: MapPin[]
  /** The viewer's real position, or null when unknown/denied. */
  myLocation?: { lat: number; lng: number } | null
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LayerGroup | null>(null)
  const meRef = useRef<import("leaflet").Marker | null>(null)
  const LRef = useRef<typeof import("leaflet") | null>(null)
  const onSelectRef = useRef(onSelectListing)
  onSelectRef.current = onSelectListing
  const [ready, setReady] = useState(false)
  // Frame the data once; afterwards the user's pan/zoom is theirs to keep.
  const hasFramedRef = useRef(false)

  // Initialise the Leaflet map once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current || mapRef.current) return
      LRef.current = L

      const map = L.map(containerRef.current, {
        center: [FALLBACK_CENTER.lat, FALLBACK_CENTER.lng],
        zoom: FALLBACK_ZOOM,
        zoomControl: false,
        attributionControl: false,
        // full interactivity — pan/drag + smooth zoom (Waze-like)
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        zoomSnap: 0.25,
        wheelPxPerZoomLevel: 90,
      })

      // CARTO Positron: clean minimalist base — light grey/white roads (no yellow/orange),
      // subtle green parks, soft muted-blue water, with clear street + city labels.
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
        detectRetina: true,
      }).addTo(map)

      // The "my location" pulse dot is added only once a real fix arrives —
      // see the effect below. Showing it at a hardcoded point would tell the
      // user they're somewhere they aren't.
      markersRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setReady(true)

      // Ensure correct sizing after layout settles.
      setTimeout(() => map.invalidateSize(), 0)
    })()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  // Keep the map sized correctly when its container changes.
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => mapRef.current?.invalidateSize())
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Re-render markers whenever the (filtered) pins change.
  useEffect(() => {
    const L = LRef.current
    const group = markersRef.current
    if (!L || !group) return
    group.clearLayers()
    for (const p of pins) {
      const isSupply = p.type === "supply"
      const icon = L.divIcon({
        className: "sandit-marker",
        html: `<span class="flex size-9 items-center justify-center rounded-full rounded-bl-none shadow-lg ${
          isSupply ? "bg-sage text-sage-foreground" : "bg-primary text-primary-foreground"
        }">${PACKAGE_SVG}</span>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })
      const marker = L.marker([p.lat, p.lng], { icon })
        .bindTooltip(p.label, { direction: "top", offset: [0, -38], opacity: 1 })
        .addTo(group)
      if (p.listing) {
        const listing = p.listing
        marker.on("click", () => onSelectRef.current?.(listing))
        marker.getElement()?.style.setProperty("cursor", "pointer")
      }
    }

    // Frame whatever we actually have, the first time there's anything to frame.
    const map = mapRef.current
    if (map && !hasFramedRef.current && pins.length > 0) {
      hasFramedRef.current = true
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]))
      if (myLocation) bounds.extend([myLocation.lat, myLocation.lng])
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
    }
  }, [pins, ready, myLocation])

  // Show (and follow) the real device position once it's known.
  useEffect(() => {
    const L = LRef.current
    const map = mapRef.current
    if (!L || !map) return

    if (!myLocation) {
      meRef.current?.remove()
      meRef.current = null
      return
    }

    const icon = L.divIcon({
      className: "sandit-marker",
      html: `<span class="relative flex"><span class="absolute inset-0 -m-3 animate-ping rounded-full bg-blue-500/20"></span><span class="block size-4 rounded-full border-2 border-white bg-blue-500 shadow"></span></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    if (meRef.current) {
      meRef.current.setLatLng([myLocation.lat, myLocation.lng])
    } else {
      meRef.current = L.marker([myLocation.lat, myLocation.lng], { icon, interactive: false }).addTo(map)
    }
  }, [myLocation, ready])

  // Recentre on the viewer if we know where they are, otherwise on the pins.
  function recenter() {
    const map = mapRef.current
    const L = LRef.current
    if (!map || !L) return

    if (myLocation) {
      map.flyTo([myLocation.lat, myLocation.lng], 13, { duration: 0.6 })
      return
    }
    if (pins.length > 0) {
      map.flyToBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), {
        padding: [48, 48],
        maxZoom: 13,
        duration: 0.6,
      })
      return
    }
    map.flyTo([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng], FALLBACK_ZOOM, { duration: 0.6 })
  }

  return (
    <div className={`relative isolate overflow-hidden bg-muted ${rounded} ${className}`}>
      {/* Leaflet canvas */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* floating controls (bottom-start) */}
      <div className="absolute bottom-4 start-4 z-[1000] flex flex-col gap-2">
        {onOpenFilter ? (
          <button
            type="button"
            onClick={onOpenFilter}
            aria-label="סינון"
            className="flex size-11 items-center justify-center rounded-2xl bg-card text-foreground shadow-md transition-colors hover:bg-accent"
          >
            <SlidersHorizontal className="size-5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={recenter}
          aria-label={myLocation ? "המיקום שלי" : "מרכוז המודעות"}
          className="flex size-11 items-center justify-center rounded-2xl bg-card text-foreground shadow-md transition-colors hover:bg-accent"
        >
          <Crosshair className="size-5" />
        </button>
      </div>

      {/* legend */}
      <div className="absolute end-4 top-4 z-[1000] flex flex-col gap-1.5 rounded-2xl bg-card/90 px-3 py-2 text-xs font-semibold shadow-md backdrop-blur">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-sage" /> מציעים
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-primary" /> מבקשים
        </span>
      </div>
    </div>
  )
}
