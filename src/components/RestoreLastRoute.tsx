"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const LAST_ROUTE_KEY = "codesync:last-route";
const RESTORE_FROM_PATHS = new Set(["/", "/dashboard"]);

function RestoreLastRoute() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkedReloadRef = useRef(false);

  useEffect(() => {
    if (!pathname) return;

    const query = searchParams?.toString() ?? "";
    const currentRoute = query ? `${pathname}?${query}` : pathname;

    if (!checkedReloadRef.current) {
      checkedReloadRef.current = true;

      const navigationEntry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isReload = navigationEntry?.type === "reload";
      const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY);

      const canRestoreFromCurrentPath = RESTORE_FROM_PATHS.has(pathname);

      if (
        isReload &&
        canRestoreFromCurrentPath &&
        lastRoute &&
        lastRoute.startsWith("/") &&
        lastRoute !== currentRoute
      ) {
        router.replace(lastRoute);
        return;
      }
    }

    sessionStorage.setItem(LAST_ROUTE_KEY, currentRoute);
  }, [pathname, searchParams, router]);

  return null;
}

export default RestoreLastRoute;