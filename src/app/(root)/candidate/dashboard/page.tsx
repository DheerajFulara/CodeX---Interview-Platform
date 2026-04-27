"use client";

import DashboardHome from "@/components/DashboardHome";
import LoaderUI from "@/components/LoaderUI";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function CandidateDashboardPage() {
  const router = useRouter();
  const { isLoading, isCandidate, isInterviewer, hasRole } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    if (!hasRole) {
      router.replace("/onboarding");
      return;
    }

    if (isInterviewer) {
      router.replace("/interviewer/dashboard");
    }
  }, [hasRole, isInterviewer, isLoading, router]);

  if (isLoading || !isCandidate) return <LoaderUI />;

  return <DashboardHome />;
}

export default CandidateDashboardPage;
