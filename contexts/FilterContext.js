"use client";

import { createContext, useContext, useState } from "react";

// Shared filter state across Explore and Map (item 3 in the upgrade spec) —
// picking a filter on one screen keeps it applied on the other.
const DEFAULT_FILTERS = {
  type: "all", // all | supply | demand
  material: "all",
  priceType: "all",
  transport: "all", // all | buyerPickup | sellerHelps | flexible
  loading: "all",
  radiusKm: "all",
};

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  function updateFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  return <FilterContext.Provider value={{ filters, updateFilter }}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used inside FilterProvider");
  return ctx;
}
