"use client";

import ActionCard from "@/components/ActionCard";
import { QUICK_ACTIONS } from "@/constants";
import { useUserRole } from "@/hooks/useUserRole";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MeetingModal from "@/components/MeetingModal";
import LoaderUI from "@/components/LoaderUI";
import { CalendarIcon, Loader2Icon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InterviewScheduleUI from "@/app/(root)/schedule/InterviewScheduleUI";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import useMeetingActions from "@/hooks/useMeetingActions";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { Doc, Id } from "../../convex/_generated/dataModel";

type EditableProblem =
  | {
      type: "predefined";
      problemId: Id<"problems">;
    }
  | {
      type: "custom";
      title: string;
      description: string;
      examples: Array<{
        input: string;
        output: string;
        explanation?: string;
      }>;
      constraints?: string[];
      supportedLanguages?: Array<"javascript" | "python" | "java">;
      starterCode?: {
        javascript: string;
        python: string;
        java: string;
      };
    };

function DashboardHome() {
  const router = useRouter();
  const { user } = useUser();
  const { joinMeeting } = useMeetingActions();

  const { isInterviewer, isCandidate, isLoading } = useUserRole();
  const interviews = useQuery(api.interviews.getMyInterviews);
  const allInterviews = useQuery(api.interviews.getAllInterviews);
  const predefinedProblems = useQuery(api.problems.getAllProblems) ?? [];
  const updateInterviewDetails = useMutation((api as any).interviews.updateInterviewDetails);
  const cancelInterview = useMutation((api as any).interviews.cancelInterview);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Doc<"interviews"> | null>(null);
  const [cancelingInterview, setCancelingInterview] = useState<Doc<"interviews"> | null>(null);
  const [isUpdatingInterview, setIsUpdatingInterview] = useState(false);
  const [isCancelingInterview, setIsCancelingInterview] = useState(false);
  const [modalType, setModalType] = useState<"start" | "join">();
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
  });
  const [selectedProblems, setSelectedProblems] = useState<EditableProblem[]>([]);
  const [selectedPredefinedProblemId, setSelectedPredefinedProblemId] = useState<string>("");
  const [customProblem, setCustomProblem] = useState({
    title: "",
    description: "",
    exampleInput: "",
    exampleOutput: "",
    exampleExplanation: "",
    constraintsText: "",
  });

  const upcomingInterviews = useMemo(() => {
    const now = Date.now();

    if (isInterviewer) {
      if (!user?.id || !allInterviews) return [];

      return allInterviews
        .filter(
          (interview) =>
            interview.interviewerIds.includes(user.id) &&
            interview.startTime > now &&
            interview.status !== "canceled"
        )
        .sort((a, b) => a.startTime - b.startTime);
    }

    if (isCandidate && interviews) {
      return interviews
        .filter((interview) => interview.startTime > now)
        .sort((a, b) => a.startTime - b.startTime);
    }

    return [];
  }, [allInterviews, interviews, isCandidate, isInterviewer, user?.id]);

  const handleQuickAction = (title: string) => {
    switch (title) {
      case "New Call":
        setModalType("start");
        setShowModal(true);
        break;
      case "Join Interview":
        setModalType("join");
        setShowModal(true);
        break;
      case "Schedule":
        setShowScheduleModal(true);
        break;
      default:
        router.push(`/${title.toLowerCase()}`);
    }
  };

  const handleOpenEdit = (interview: Doc<"interviews">) => {
    const interviewDate = new Date(interview.startTime);

    setEditForm({
      title: interview.title,
      description: interview.description ?? "",
      date: format(interviewDate, "yyyy-MM-dd"),
      time: format(interviewDate, "HH:mm"),
    });
    setSelectedProblems((interview.problems as EditableProblem[] | undefined) ?? []);
    setSelectedPredefinedProblemId("");
    setCustomProblem({
      title: "",
      description: "",
      exampleInput: "",
      exampleOutput: "",
      exampleExplanation: "",
      constraintsText: "",
    });
    setEditingInterview(interview);
  };

  const addPredefinedProblem = () => {
    if (!selectedPredefinedProblemId) return;

    const alreadyAdded = selectedProblems.some(
      (problem) =>
        problem.type === "predefined" && problem.problemId === selectedPredefinedProblemId
    );

    if (alreadyAdded) {
      toast.error("This problem is already added");
      return;
    }

    setSelectedProblems((prev) => [
      ...prev,
      {
        type: "predefined",
        problemId: selectedPredefinedProblemId as Id<"problems">,
      },
    ]);
    setSelectedPredefinedProblemId("");
  };

  const addCustomProblem = () => {
    if (
      !customProblem.title.trim() ||
      !customProblem.description.trim() ||
      !customProblem.exampleInput.trim() ||
      !customProblem.exampleOutput.trim()
    ) {
      toast.error("Please complete custom problem details");
      return;
    }

    const constraints = customProblem.constraintsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    setSelectedProblems((prev) => [
      ...prev,
      {
        type: "custom",
        title: customProblem.title.trim(),
        description: customProblem.description.trim(),
        examples: [
          {
            input: customProblem.exampleInput.trim(),
            output: customProblem.exampleOutput.trim(),
            explanation: customProblem.exampleExplanation.trim() || undefined,
          },
        ],
        constraints: constraints.length > 0 ? constraints : undefined,
        supportedLanguages: ["javascript", "python", "java"],
        starterCode: {
          javascript: "function solve(input) {\n  // Write your solution here\n\n}",
          python: "def solve(input):\n    # Write your solution here\n    pass",
          java: "class Solution {\n    public void solve(Object input) {\n        // Write your solution here\n\n    }\n}",
        },
      },
    ]);

    setCustomProblem({
      title: "",
      description: "",
      exampleInput: "",
      exampleOutput: "",
      exampleExplanation: "",
      constraintsText: "",
    });
  };

  const removeProblemAt = (index: number) => {
    setSelectedProblems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateInterview = async () => {
    if (!editingInterview) return;
    if (!editForm.title.trim() || !editForm.date || !editForm.time) {
      toast.error("Please complete title, date and time");
      return;
    }

    const [hours, minutes] = editForm.time.split(":");
    const updatedDate = new Date(editForm.date);
    updatedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const problemsForSave = [...selectedProblems];

    if (selectedPredefinedProblemId) {
      const alreadyAdded = problemsForSave.some(
        (problem) =>
          problem.type === "predefined" &&
          String(problem.problemId) === String(selectedPredefinedProblemId)
      );

      if (!alreadyAdded) {
        problemsForSave.push({
          type: "predefined",
          problemId: selectedPredefinedProblemId as Id<"problems">,
        });
      }
    }

    setIsUpdatingInterview(true);

    try {
      await updateInterviewDetails({
        id: editingInterview._id,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        startTime: updatedDate.getTime(),
        problems: problemsForSave,
      });

      toast.success("Interview updated successfully");
      setEditingInterview(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update interview details");
    } finally {
      setIsUpdatingInterview(false);
    }
  };

  const handleCancelInterview = async () => {
    if (!cancelingInterview) return;

    try {
      setIsCancelingInterview(true);
      await cancelInterview({ id: cancelingInterview._id });
      toast.success("Interview canceled successfully");
      setCancelingInterview(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel interview");
    } finally {
      setIsCancelingInterview(false);
    }
  };

  if (isLoading) return <LoaderUI />;

  return (
    <div className="container max-w-7xl mx-auto p-6">
      {/* WELCOME SECTION */}
      <div className="rounded-lg bg-card p-6 border shadow-sm mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          Welcome back!
        </h1>
        <p className="text-muted-foreground mt-2">
          {isInterviewer
            ? "Manage your interviews and review candidates effectively"
            : "Access your upcoming interviews and preparations"}
        </p>
      </div>

      {isInterviewer ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUICK_ACTIONS.map((action) => (
              <ActionCard
                key={action.title}
                action={action}
                onClick={() => handleQuickAction(action.title)}
              />
            ))}
          </div>

          <div className="mt-10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Upcoming Interviews</h2>
              <Badge variant="secondary">{upcomingInterviews.length}</Badge>
            </div>

            {allInterviews === undefined ? (
              <div className="flex justify-center py-10">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingInterviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingInterviews.map((interview) => {
                  const now = new Date();
                  const interviewTime = new Date(interview.startTime);
                  const canJoin =
                    interviewTime.getTime() - now.getTime() <= 10 * 60 * 1000;

                  return (
                    <Card
                      key={interview._id}
                      className="transition-all duration-300 hover:border-primary/50 hover:shadow-md"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground">Role: Interviewer</p>
                          <Badge variant="outline">Upcoming</Badge>
                        </div>
                        <CardTitle className="line-clamp-1">{interview.title}</CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{format(interviewTime, "EEE, MMM d · h:mm a")}</span>
                        </div>

                        <Button
                          className="w-full"
                          disabled={!canJoin}
                          variant={canJoin ? "default" : "outline"}
                          onClick={() => joinMeeting(interview.streamCallId)}
                        >
                          {canJoin ? "Join Interview" : "Available 10 min before start"}
                        </Button>

                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() => handleOpenEdit(interview)}
                        >
                          Edit Interview
                        </Button>

                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={() => setCancelingInterview(interview)}
                        >
                          Cancel Meeting
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                No upcoming interviews scheduled
              </div>
            )}
          </div>

          <MeetingModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={modalType === "join" ? "Join Meeting" : "Start Meeting"}
            isJoinMeeting={modalType === "join"}
          />

          <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
            <DialogContent className="sm:max-w-[700px] h-[calc(100vh-120px)] overflow-auto">
              <DialogHeader>
                <DialogTitle>Schedule Interview</DialogTitle>
              </DialogHeader>
              <InterviewScheduleUI
                embedded
                onScheduled={() => setShowScheduleModal(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={!!cancelingInterview} onOpenChange={(open) => !open && setCancelingInterview(null)}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Cancel Meeting</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This will cancel the interview for both interviewer and candidate. The candidate will
                receive a cancellation notification.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setCancelingInterview(null)}>
                  Keep Meeting
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelInterview}
                  disabled={isCancelingInterview}
                >
                  {isCancelingInterview ? "Canceling..." : "Cancel Meeting"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editingInterview} onOpenChange={(open) => !open && setEditingInterview(null)}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Upcoming Interview</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Interview title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Interview description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time</label>
                    <Input
                      type="time"
                      value={editForm.time}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-3 border rounded-md p-4">
                  <div>
                    <label className="text-sm font-medium">Problems</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add or remove predefined and custom problems for this interview.
                    </p>
                  </div>

                  {selectedProblems.length > 0 && (
                    <div className="space-y-2">
                      {selectedProblems.map((problem, index) => {
                        const predefinedTitle =
                          problem.type === "predefined"
                            ? predefinedProblems.find((item) => item._id === problem.problemId)
                                ?.title || "Predefined Problem"
                            : null;

                        return (
                          <div
                            key={`${problem.type}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                          >
                            <span className="truncate">
                              {problem.type === "predefined"
                                ? `Predefined: ${predefinedTitle}`
                                : `Custom: ${problem.title}`}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeProblemAt(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Add Predefined Problem</label>
                    <div className="flex gap-2">
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={selectedPredefinedProblemId}
                        onChange={(e) => setSelectedPredefinedProblemId(e.target.value)}
                      >
                        <option value="">Select a predefined problem</option>
                        {predefinedProblems.map((problem) => (
                          <option key={problem._id} value={problem._id}>
                            {problem.title}
                          </option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" onClick={addPredefinedProblem}>
                        Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <label className="text-sm font-medium">Create Custom Problem</label>
                    <Input
                      placeholder="Custom problem title"
                      value={customProblem.title}
                      onChange={(e) =>
                        setCustomProblem((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Custom problem description"
                      value={customProblem.description}
                      onChange={(e) =>
                        setCustomProblem((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                    />
                    <Input
                      placeholder="Example input"
                      value={customProblem.exampleInput}
                      onChange={(e) =>
                        setCustomProblem((prev) => ({ ...prev, exampleInput: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Example output"
                      value={customProblem.exampleOutput}
                      onChange={(e) =>
                        setCustomProblem((prev) => ({ ...prev, exampleOutput: e.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Example explanation (optional)"
                      value={customProblem.exampleExplanation}
                      onChange={(e) =>
                        setCustomProblem((prev) => ({ ...prev, exampleExplanation: e.target.value }))
                      }
                      rows={2}
                    />
                    <Textarea
                      placeholder="Constraints (one per line, optional)"
                      value={customProblem.constraintsText}
                      onChange={(e) =>
                        setCustomProblem((prev) => ({ ...prev, constraintsText: e.target.value }))
                      }
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={addCustomProblem}>
                        Add Custom Problem
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditingInterview(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateInterview} disabled={isUpdatingInterview}>
                    {isUpdatingInterview ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <div className="mt-10 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-2xl font-semibold">Upcoming Interviews</h2>
                <p className="text-sm text-muted-foreground">Your next scheduled interviews</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{upcomingInterviews.length}</Badge>
                <Link href="/previous-interviews">
                  <Button variant="outline" size="sm">
                    View Previous Interviews
                  </Button>
                </Link>
              </div>
            </div>

            {interviews === undefined ? (
              <div className="flex justify-center py-10">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : upcomingInterviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingInterviews.map((interview) => {
                  const now = new Date();
                  const interviewTime = new Date(interview.startTime);
                  const canJoin =
                    interviewTime.getTime() - now.getTime() <= 10 * 60 * 1000;

                  return (
                    <Card
                      key={interview._id}
                      className="transition-all duration-300 hover:border-primary/50 hover:shadow-md"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground">Role: Candidate</p>
                          <Badge variant="outline">Upcoming</Badge>
                        </div>
                        <CardTitle className="line-clamp-1">{interview.title}</CardTitle>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{format(interviewTime, "EEE, MMM d · h:mm a")}</span>
                        </div>

                        <Button
                          className="w-full"
                          disabled={!canJoin}
                          variant={canJoin ? "default" : "outline"}
                          onClick={() => joinMeeting(interview.streamCallId)}
                        >
                          {canJoin ? "Join Interview" : "Available 10 min before start"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                No upcoming interviews scheduled
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardHome;
