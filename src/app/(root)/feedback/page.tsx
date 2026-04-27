"use client";

import { useUserRole } from "@/hooks/useUserRole";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { MessageSquareTextIcon, StarIcon, Trash2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoaderUI from "@/components/LoaderUI";
import { getInterviewerInfo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";

function FeedbackPage() {
  const { isLoading, isCandidate } = useUserRole();
  const feedbacks = useQuery(api.feedbacks.getMyFeedback);
  const users = useQuery(api.users.getUsers);
  const deleteFeedback = useMutation(api.feedbacks.deleteMyFeedback);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Doc<"feedbacks"> | null>(null);

  if (isLoading || feedbacks === undefined || users === undefined) {
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

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-xs text-muted-foreground">No rating</span>;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;

    try {
      await deleteFeedback({ feedbackId: feedbackToDelete._id });
      toast.success("Feedback deleted");
      setFeedbackToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete feedback");
    }
  };

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {/* <h1 className="text-3xl font-bold">Feedback</h1>
          <p className="text-muted-foreground mt-1">
            Review interviewer feedback from your completed interviews
          </p> */}
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
    FeedBack
  </h1>

  <p className="text-muted-foreground mt-2 text-sm md:text-base">
    Review interviewer feedback from your completed interviews
  </p>
          
        </div>

        <Link href="/candidate/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Candidate Dashboard
          </Button>
        </Link>
      </div>

      {feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <MessageSquareTextIcon className="h-8 w-8" />
              <p>No feedback available yet</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedbacks.map((feedback) => {
            const interviewer = getInterviewerInfo(users, feedback.interviewerId);

            return (
              <Card key={feedback._id}>
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-lg">From {interviewer.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{format(new Date(feedback.createdAt), "PPP p")}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setFeedbackToDelete(feedback)}
                        aria-label="Delete feedback"
                      >
                        <Trash2Icon className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {renderStars(feedback.rating)}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Suggestions for Improvement</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {feedback.suggestions || "No suggestions provided"}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-1">Strengths</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {feedback.strengths || "No strengths provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!feedbackToDelete} onOpenChange={(open) => !open && setFeedbackToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>
              This feedback will be removed from your dashboard.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFeedback}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FeedbackPage;
