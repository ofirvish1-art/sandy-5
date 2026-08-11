"use client";

import { Hourglass as HourglassIcon } from "lucide-react";

// Item 10: small animated hourglass decoration for the home header — the
// icon itself flips (CSS animation), and a "grain" dot fades through the
// center mid-flip to read as sand pouring.
export default function Hourglass({ size = 20, className = "" }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <HourglassIcon size={size} strokeWidth={2.25} className="animate-hourglass" />
      <span
        className="animate-hourglass-sand absolute rounded-full bg-current"
        style={{ width: Math.max(2, size * 0.09), height: Math.max(2, size * 0.09), top: "50%", left: "50%", marginTop: -Math.max(1, size * 0.045), marginLeft: -Math.max(1, size * 0.045) }}
      />
    </span>
  );
}
