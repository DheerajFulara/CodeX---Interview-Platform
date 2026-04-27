"use client";

import DashboardHome from "@/components/DashboardHome";
import LoaderUI from "@/components/LoaderUI";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function InterviewerDashboardPage() {
  const router = useRouter();
  const { isLoading, isCandidate, isInterviewer, hasRole } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    if (!hasRole) {
      router.replace("/onboarding");
      return;
    }

    if (isCandidate) {
      router.replace("/candidate/dashboard");
    }
  }, [hasRole, isCandidate, isLoading, router]);

  if (isLoading || !isInterviewer) return <LoaderUI />;

  return <DashboardHome />;
}

export default InterviewerDashboardPage;
