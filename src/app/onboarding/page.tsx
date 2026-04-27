"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useUser, UserButton } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { useUserRole } from "@/hooks/useUserRole";
import LoaderUI from "@/components/LoaderUI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserRoundCheckIcon, BriefcaseBusinessIcon, SparklesIcon } from "lucide-react";
import toast from "react-hot-toast";
import { ModeToggle } from "@/components/ModeToggle";
import Link from "next/link";
import { CodeIcon } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/70">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* <Link href="/" className="flex items-center gap-2 text-2xl font-semibold font-mono">
            <SparklesIcon className="size-7 text-emerald-500" />
            <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
              CodeX
            </span>
          </Link> */}
          <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-2xl mr-6 font-mono hover:opacity-80 transition-opacity"
        >
          <CodeIcon className="size-8 text-emerald-500" />
          <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            CodeX
          </span>
        </Link>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Choose Your Role</h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Pick your role to personalize your dashboard and interview workflow.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="relative overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
              <CardHeader className="relative space-y-3">
                <UserRoundCheckIcon className="size-7 text-emerald-400" />
                <CardTitle>Candidate</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-5">
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

            <Card className="relative overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent" />
              <CardHeader className="relative space-y-3">
                <BriefcaseBusinessIcon className="size-7 text-emerald-400" />
                <CardTitle>Interviewer</CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-5">
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
      </main>
    </div>
  );
}

export default OnboardingPage;
