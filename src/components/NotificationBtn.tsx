"use client";

import Link from "next/link";
import { BellIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { useUserRole } from "@/hooks/useUserRole";

function NotificationBtn() {
  const { isCandidate, isLoading } = useUserRole();
  const unreadCount = useQuery((api as any).notifications.getMyUnreadNotificationCount) ?? 0;

  if (isLoading || !isCandidate) return null;

  const displayCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Link href="/profile" className="relative inline-flex">
      <Button className="gap-2 font-medium" size="sm" variant="outline">
        <BellIcon className="size-4" />
        Notifications
      </Button>

      {unreadCount > 0 && (
        <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {displayCount}
        </span>
      )}
    </Link>
  );
}

export default NotificationBtn;
