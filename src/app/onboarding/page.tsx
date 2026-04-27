"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { useUserRole } from "@/hooks/useUserRole";
import LoaderUI from "@/components/LoaderUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRoundCheckIcon, BriefcaseBusinessIcon } from "lucide-react";
import toast from "react-hot-toast";
import { ModeToggle } from "@/components/ModeToggle";

function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { isLoading, isCandidate, isInterviewer, hasRole } = useUserRole();
  const setUserRole = useMutation(api.users.setUserRole);
  const [isSubmitting, setIsSubmitting] = useState<"candidate" | "interviewer" | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/");
      return;
    }

    if (!isLoading && hasRole) {
      if (isCandidate) router.replace("/candidate/dashboard");
      if (isInterviewer) router.replace("/interviewer/dashboard");
    }
  }, [hasRole, isCandidate, isInterviewer, isLoaded, isLoading, isSignedIn, router]);

  const handleSelectRole = async (role: "candidate" | "interviewer") => {
    if (!user?.id) return;

    try {
      setIsSubmitting(role);
      await setUserRole({ userId: user.id, role });
      toast.success("Role selected successfully");

      if (role === "candidate") {
        router.replace("/candidate/dashboard");
      } else {
        router.replace("/interviewer/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to set role. Please try again.");
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!isLoaded || isLoading) return <LoaderUI />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="fixed right-4 top-4 z-20">
        <ModeToggle />
      </div>

      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="px-3 py-1">
            CodeX Onboarding
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">Choose Your Role</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/70 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-lg hover:shadow-emerald-500/10">
            <CardHeader className="space-y-3">
              <UserRoundCheckIcon className="size-7 text-emerald-400" />
              <CardTitle>Candidate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground">Practice and attend interviews</p>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                onClick={() => handleSelectRole("candidate")}
                disabled={isSubmitting !== null}
              >
                {isSubmitting === "candidate" ? "Setting Role..." : "Continue as Candidate"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-lg hover:shadow-emerald-500/10">
            <CardHeader className="space-y-3">
              <BriefcaseBusinessIcon className="size-7 text-emerald-400" />
              <CardTitle>Interviewer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-muted-foreground">Conduct and manage interviews</p>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500"
                onClick={() => handleSelectRole("interviewer")}
                disabled={isSubmitting !== null}
              >
                {isSubmitting === "interviewer"
                  ? "Setting Role..."
                  : "Continue as Interviewer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
