"use client";

import { useState } from "react";
import { searchCities } from "@/lib/cities";

// Structured city picker: stores { cityName, lat, lng, region } via onSelect,
// instead of a free-typed string. Item 2 in the Hulit upgrade spec.
export default function CityAutocomplete({ value, onSelect, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const results = searchCities(query);

  function pick(city) {
    setQuery(city.cityName);
    setOpen(false);
    onSelect(city);
  }

  return (
    <div className="relative">
      <input
        className="field-input"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || "התחל להקליד שם עיר…"}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white rounded-xl border border-sage-dark/40 shadow-lg overflow-hidden">
          {results.map((c) => (
            <li key={c.cityName}>
              <button
                type="button"
                onMouseDown={() => pick(c)}
                className="w-full text-right px-4 py-2.5 text-sm hover:bg-sage/20 flex items-center justify-between"
              >
                <span>{c.cityName}</span>
                <span className="text-forest/40 text-xs">{c.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
