"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { UserCircle2Icon } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

function ProfileBtn() {
  const { isInterviewer, isLoading } = useUserRole();

  if (isLoading || !isInterviewer) return null;

  return (
    <Link href="/profile">
      <Button className="gap-2 font-medium" size="sm" variant="outline">
        <UserCircle2Icon className="size-4" />
        Previous Sessions
      </Button>
    </Link>
  );
}

export default ProfileBtn;
