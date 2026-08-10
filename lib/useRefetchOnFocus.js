"use client";

import { useEffect } from "react";

// Item 11: re-fetch data whenever the tab regains focus or visibility —
// so listings/notifications feel live without a manual refresh.
export function useRefetchOnFocus(callback) {
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") callback();
    }
    window.addEventListener("focus", callback);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", callback);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
