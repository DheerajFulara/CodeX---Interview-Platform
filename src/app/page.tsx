"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Code2Icon,
  CalendarDaysIcon,
  BrainCircuitIcon,
  VideoIcon,
  SparklesIcon,
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
    title: "AI Feedback",
    description: "Receive structured interview feedback and performance insights.",
    icon: BrainCircuitIcon,
    gradient: "from-green-500/15 via-lime-400/5 to-transparent",
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
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/70">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-2xl font-semibold font-mono">
            <SparklesIcon className="size-7 text-emerald-500" />
            <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <section className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
            Ace Your Technical Interviews
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
            Practice with real-time coding, collaborate in live interview rooms, and improve with
            actionable feedback in one platform.
          </p>
          <div className="mt-8">
            <SignInButton mode="modal">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500">
                Get Started
              </Button>
            </SignInButton>
          </div>
        </section>

        <section className="mt-14 md:mt-16">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="relative overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient}`} />
                <CardHeader className="relative">
                  <feature.icon className="size-6 text-emerald-400" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative text-sm text-muted-foreground">
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
