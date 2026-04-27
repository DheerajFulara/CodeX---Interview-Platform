"use client";

import LoaderUI from "@/components/LoaderUI";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { getCandidateInfo } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeftIcon, BellIcon, CalendarIcon, ClockIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

function ProfilePage() {
  const { isLoading, isInterviewer, isCandidate } = useUserRole();
  const interviews = useQuery(api.interviews.getInterviewerPreviousInterviews) ?? [];
  const notifications = useQuery((api as any).notifications.getMyNotifications) ?? [];
  const markNotificationsRead = useMutation((api as any).notifications.markMyNotificationsRead);
  const users = useQuery(api.users.getUsers) ?? [];
  const hideInterview = useMutation(api.interviews.hideInterviewerInterview);
  const [interviewToDelete, setInterviewToDelete] = useState<(typeof interviews)[number] | null>(
    null
  );

  const candidateInfoById = useMemo(() => {
    return interviews.reduce((acc, interview) => {
      acc[interview._id] = getCandidateInfo(users, interview.candidateId);
      return acc;
    }, {} as Record<string, ReturnType<typeof getCandidateInfo>>);
  }, [interviews, users]);

  const unreadCount = useMemo(
    () => notifications.filter((notification: any) => notification.isRead !== true).length,
    [notifications]
  );

  useEffect(() => {
    if (!isCandidate || unreadCount === 0) return;

    markNotificationsRead().catch((error: unknown) => {
      console.error("Failed to mark notifications as read:", error);
    });
  }, [isCandidate, markNotificationsRead, unreadCount]);

  if (isLoading || users === undefined) return <LoaderUI />;

  if (isCandidate) {
    return (
      <div className="container max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* <h1>
            Notifications
          </h1>
          <p className="font-bold mt-1">
            Notifications about interview schedules, cancellations, and feedback
          </p> */}
          <div className="mb-6">
  <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
    Notifications
  </h1>

  <p className="text-muted-foreground mt-2 text-sm md:text-base">
    Notifications about interview schedules, cancellations, and feedback
  </p>
</div>

          <Link href="/candidate/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Candidate Dashboard
            </Button>
          </Link>
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {notifications.map((notification: any) => (
              <Card key={notification._id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <BellIcon className="h-4 w-4 text-primary" />
                      <p className="font-semibold">{notification.title}</p>
                    </div>
                    <Badge variant="outline">{format(new Date(notification.createdAt), "PPP p")}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{notification.message}</p>

                  {notification.interviewerName && (
                    <p className="text-xs text-muted-foreground">
                      Interviewer: <span className="font-medium">{notification.interviewerName}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!isInterviewer) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This section is available only for interviewers.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeleteInterview = async () => {
    if (!interviewToDelete) return;

    try {
      await hideInterview({ interviewId: interviewToDelete._id });
      toast.success("Interview removed from profile");
      setInterviewToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove interview");
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Previous Sessions</h1>
          <p className="text-muted-foreground mt-1">
            Previous interview details and history
          </p>
        </div>

        <Link href="/interviewer/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Interviewer Dashboard
          </Button>
        </Link>
      </div>

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No previous interviews available yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {interviews.map((interview) => {
            const candidateInfo = candidateInfoById[interview._id];
            const meetingDate = new Date(interview.startTime);

            return (
              <Card key={interview._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={candidateInfo?.image} />
                        <AvatarFallback>{candidateInfo?.initials || "UC"}</AvatarFallback>
                      </Avatar>

                      <div>
                        <CardTitle className="text-base">{candidateInfo?.name || "Unknown Candidate"}</CardTitle>
                        <p className="text-sm text-muted-foreground">{interview.title}</p>
                      </div>
                    </div>

                    <Badge variant="outline">Completed</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {format(meetingDate, "MMM dd, yyyy")}
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      {format(meetingDate, "hh:mm a")}
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">Role:</span> Interviewer
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setInterviewToDelete(interview)}
                  >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!interviewToDelete}
        onOpenChange={(open) => !open && setInterviewToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Interview Details</DialogTitle>
            <DialogDescription>
              This will remove the interview card from your profile only.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInterview}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfilePage;