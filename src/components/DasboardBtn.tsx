"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { MessageSquareTextIcon, SparklesIcon } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

function DasboardBtn() {
  const { isCandidate, isInterviewer, isLoading } = useUserRole();

  if (isLoading) return null;

  if (isCandidate) {
    return (
      <Link href="/feedback">
        <Button className="gap-2 font-medium" size="sm" variant="outline">
          <MessageSquareTextIcon className="size-4" />
          Feedback
        </Button>
      </Link>
    );
  }

  if (!isInterviewer) return null;

  return (
    <Link href="/interviewer/dashboard">
      <Button className="gap-2 font-medium" size={"sm"}>
        <SparklesIcon className="size-4" />
        Dashboard
      </Button>
    </Link>
  );
}
export default DasboardBtn;
