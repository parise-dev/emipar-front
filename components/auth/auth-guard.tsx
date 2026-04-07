// components/auth/auth-guard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthSession, getToken, isAuthenticated, touchSession } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const patchedRef = useRef(false);

  useEffect(() => {
    function validate() {
      const ok = isAuthenticated();

      if (!ok) {
        clearAuthSession();
        router.replace("/login");
        return false;
      }

      return true;
    }

    validate();
    setReady(true);

    const interval = setInterval(() => {
      validate();
    }, 15000);

    const activityEvents = ["click", "keydown", "mousemove", "scroll", "focus"];

    const onActivity = () => {
      if (isAuthenticated()) {
        touchSession();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validate();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, pathname]);

  useEffect(() => {
    if (patchedRef.current) return;
    patchedRef.current = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      const token = getToken();

      const isApiEmipar =
        url.startsWith("https://api.emipar.life") ||
        url.startsWith("http://api.emipar.life");

      if (!isApiEmipar || !token) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init?.headers || {});
      headers.set("Authorization", `Bearer ${token}`);

      return originalFetch(input, {
        ...init,
        headers,
      });
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-2xl border bg-white px-6 py-4 text-sm text-zinc-600 shadow-sm">
          Validando acesso...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}