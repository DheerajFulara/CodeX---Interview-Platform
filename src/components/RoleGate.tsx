"use client";

import LoaderUI from "@/components/LoaderUI";
import { useUserRole } from "@/hooks/useUserRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function RoleGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, hasRole } = useUserRole();

  useEffect(() => {
    if (isLoading) return;

    if (!hasRole) {
      router.replace("/onboarding");
    }
  }, [hasRole, isLoading, router]);

  if (isLoading || !hasRole) return <LoaderUI />;

  return <>{children}</>;
}

export default RoleGate;
