"use client";

import LoaderUI from "@/components/LoaderUI";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function DashboardRedirectPage() {
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
      return;
    }

    if (isInterviewer) {
      router.replace("/interviewer/dashboard");
    }
  }, [hasRole, isCandidate, isInterviewer, isLoading, router]);

  return <LoaderUI />;
}

export default DashboardRedirectPage;
