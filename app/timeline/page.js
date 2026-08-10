"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// "תכנון קדימה" was renamed to "לוח עסקאות" (Trades Calendar) — see
// app/calendar/page.js. This redirect keeps any old bookmarks working.
export default function TimelineRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/calendar");
  }, [router]);
  return null;
}
