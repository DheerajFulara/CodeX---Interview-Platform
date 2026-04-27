"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Code2Icon,
  CodeIcon,
  CalendarDaysIcon,
  MessageSquareQuoteIcon,
  VideoIcon,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import LoaderUI from "@/components/LoaderUI";
import { ModeToggle } from "@/components/ModeToggle";

const FEATURES = [
  {
    title: "Real-time Coding",
    description: "Solve interview problems collaboratively with a live shared editor.",
    icon: Code2Icon,
    gradient: "from-emerald-500/15 via-emerald-400/5 to-transparent",
  },
  {
    title: "Interview Scheduling",
    description: "Plan and manage technical interviews with a streamlined workflow.",
    icon: CalendarDaysIcon,
    gradient: "from-teal-500/15 via-cyan-400/5 to-transparent",
  },
  {
    title: "Interviewer Feedback",
    description: "Get clear post-interview feedback and improvement notes from interviewers.",
    icon: MessageSquareQuoteIcon,
    gradient: "from-green-500/15 via-emerald-400/5 to-transparent",
  },
  {
    title: "Recordings",
    description: "Revisit completed sessions with searchable meeting recordings.",
    icon: VideoIcon,
    gradient: "from-emerald-600/15 via-green-500/5 to-transparent",
  },
];

function LandingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { isLoading, isCandidate, isInterviewer, hasRole } = useUserRole();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isLoading) return;

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
  }, [hasRole, isCandidate, isInterviewer, isLoaded, isLoading, isSignedIn, router]);

  if (!isLoaded || (isSignedIn && isLoading)) {
    return <LoaderUI />;
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <nav className="border-b border-border/70">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-2xl font-mono">
            <CodeIcon className="size-8 text-emerald-500" />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              CodeX
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle />
            <SignInButton mode="modal">
              <Button className="bg-emerald-600 hover:bg-emerald-500">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </nav>

      <main className="container mx-auto h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex flex-col gap-6">
        <section className="grid items-center gap-6 lg:grid-cols-2">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-bold leading-tight tracking-tight">
              Ace Your Technical Interviews
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">
              Practice with real-time coding, collaborate in live interview rooms, and improve with
              actionable feedback in one platform.
            </p>
            <div className="mt-6">
              <SignInButton mode="modal">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500">
                  Get Started
                </Button>
              </SignInButton>
            </div>
          </div>

          <div className="h-full flex items-center justify-center">
            <div className="relative w-full max-w-[560px]">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent blur-xl" />
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/40 p-2">
                <img
                  src="/ChatGPT%20Image%20Apr%2027,%202026,%2009_42_24%20PM.png"
                  alt="CodeX interview workspace preview"
                  className="w-full h-[290px] md:h-[320px] object-cover rounded-xl"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 min-h-0">
          <div className="grid h-full gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="relative overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient}`} />
                <CardHeader className="relative pb-2">
                  <feature.icon className="size-5 text-emerald-400" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
