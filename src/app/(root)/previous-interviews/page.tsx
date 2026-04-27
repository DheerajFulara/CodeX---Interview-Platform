"use client";

import LoaderUI from "@/components/LoaderUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeftIcon, CalendarIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

type Interview = Doc<"interviews">;

function PreviousInterviewsPage() {
  const { isLoading, isCandidate } = useUserRole();
  const previousInterviews = (useQuery((api as any).interviews.getCandidatePreviousInterviews) ??
    []) as Interview[];
  const hideCandidateInterview = useMutation((api as any).interviews.hideCandidateInterview);
  const [interviewToDelete, setInterviewToDelete] = useState<Interview | null>(null);

  if (isLoading || previousInterviews === undefined) {
    return <LoaderUI />;
  }

  if (!isCandidate) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This section is available only for candidates.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeleteHistory = async () => {
    if (!interviewToDelete) return;

    try {
      await hideCandidateInterview({ interviewId: interviewToDelete._id });
      toast.success("Interview removed from history");
      setInterviewToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove interview history");
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {/* <h1 className="text-3xl font-bold">Previous Interviews</h1>
          <p className="text-muted-foreground mt-1">
            Completed interview sessions from most recent to oldest
          </p> */}
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
    Previous Interviews
  </h1>

  <p className="text-muted-foreground mt-2 text-sm md:text-base">
    Completed interview sessions
  </p>
        </div>

        <Link href="/candidate/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Candidate Dashboard
          </Button>
        </Link>
      </div>

      {previousInterviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No completed interviews in history.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {previousInterviews.map((interview) => (
            <Card
              key={interview._id}
              className="transition-all duration-300 hover:border-primary/50 hover:shadow-md"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{format(new Date(interview.startTime), "EEE, MMM d · h:mm a")}</span>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </div>

                <CardTitle className="line-clamp-1">{interview.title}</CardTitle>
              </CardHeader>

              <CardContent>
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setInterviewToDelete(interview)}
                >
                  <Trash2Icon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!interviewToDelete} onOpenChange={(open) => !open && setInterviewToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Interview History</DialogTitle>
            <DialogDescription>
              This completed interview will be removed from your previous interviews list.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteHistory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PreviousInterviewsPage;
