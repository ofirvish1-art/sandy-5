"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/session";

// Per spec: unauthenticated users are redirected straight to
// Registration. There is no public landing page bypass.
const PUBLIC_PATHS = ["/register"];

export default function AuthGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/register");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-forest/50 text-sm">
        טוען…
      </div>
    );
  }

  return children;
}
