import { useUser } from "@clerk/nextjs";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserInfo from "@/components/UserInfo";
import { Loader2Icon, XIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import MeetingCard from "@/components/MeetingCard";

interface InterviewScheduleUIProps {
  embedded?: boolean;
  onScheduled?: () => void;
}

type ScheduledProblem =
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

function InterviewScheduleUI({ embedded = false, onScheduled }: InterviewScheduleUIProps) {
  const client = useStreamVideoClient();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const interviews = useQuery(api.interviews.getAllInterviews);
  const users = useQuery(api.users.getUsers) ?? [];
  const predefinedProblems = useQuery(api.problems.getAllProblems) ?? [];
  const createInterview = useMutation((api as any).interviews.createInterview);

  const candidates = users?.filter((u) => u.role === "candidate");
  const interviewers = users?.filter((u) => u.role === "interviewer");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date(),
    time: "09:00",
    candidateEmail: "",
    candidateId: "",
    interviewerIds: user?.id ? [user.id] : [],
  });
  const [selectedProblems, setSelectedProblems] = useState<ScheduledProblem[]>([]);
  const [selectedPredefinedProblemId, setSelectedPredefinedProblemId] = useState<string>("");
  const [customProblem, setCustomProblem] = useState({
    title: "",
    description: "",
    exampleInput: "",
    exampleOutput: "",
    exampleExplanation: "",
    constraintsText: "",
  });

  const scheduleMeeting = async () => {
    if (!client || !user) return;

    const normalizedEmail = formData.candidateEmail.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!isValidEmail || formData.interviewerIds.length === 0) {
      toast.error("Please provide a valid candidate email and at least one interviewer");
      return;
    }

    setIsCreating(true);

    try {
      const { title, description, date, time, candidateId, interviewerIds } = formData;
      const [hours, minutes] = time.split(":");
      const meetingDate = new Date(date);
      meetingDate.setHours(parseInt(hours), parseInt(minutes), 0);

      const id = crypto.randomUUID();
      const call = client.call("default", id);

      await call.getOrCreate({
        data: {
          starts_at: meetingDate.toISOString(),
          custom: {
            description: title,
            additionalDetails: description,
          },
        },
      });

      await createInterview({
        title,
        description,
        startTime: meetingDate.getTime(),
        status: "upcoming",
        streamCallId: id,
        candidateEmail: normalizedEmail,
        candidateId: candidateId || undefined,
        interviewerIds,
        problems: selectedProblems,
      });

      if (!embedded) {
        setOpen(false);
      }
      onScheduled?.();
      toast.success("Meeting scheduled successfully!");

      setFormData({
        title: "",
        description: "",
        date: new Date(),
        time: "09:00",
        candidateEmail: "",
        candidateId: "",
        interviewerIds: user?.id ? [user.id] : [],
      });
      setSelectedProblems([]);
      setSelectedPredefinedProblemId("");
      setCustomProblem({
        title: "",
        description: "",
        exampleInput: "",
        exampleOutput: "",
        exampleExplanation: "",
        constraintsText: "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to schedule meeting. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const addInterviewer = (interviewerId: string) => {
    if (!formData.interviewerIds.includes(interviewerId)) {
      setFormData((prev) => ({
        ...prev,
        interviewerIds: [...prev.interviewerIds, interviewerId],
      }));
    }
  };

  const removeInterviewer = (interviewerId: string) => {
    if (interviewerId === user?.id) return;
    setFormData((prev) => ({
      ...prev,
      interviewerIds: prev.interviewerIds.filter((id) => id !== interviewerId),
    }));
  };

  const selectedInterviewers = interviewers.filter((i) =>
    formData.interviewerIds.includes(i.clerkId)
  );

  const availableInterviewers = interviewers.filter(
    (i) => !formData.interviewerIds.includes(i.clerkId)
  );

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

  const renderForm = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          placeholder="Interview title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          placeholder="Interview description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Candidate Email</label>
        <Input
          type="email"
          placeholder="candidate@example.com"
          value={formData.candidateEmail}
          onChange={(e) =>
            setFormData({
              ...formData,
              candidateEmail: e.target.value,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          Candidate can be unregistered. They will see this interview after signing up with this email.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Existing Candidate (Optional)</label>
        <Select
          value={formData.candidateId}
          onValueChange={(candidateId) => {
            const selectedCandidate = candidates.find((candidate) => candidate.clerkId === candidateId);

            setFormData({
              ...formData,
              candidateId,
              candidateEmail: selectedCandidate?.email ?? formData.candidateEmail,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select registered candidate" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((candidate) => (
              <SelectItem key={candidate.clerkId} value={candidate.clerkId}>
                <UserInfo user={candidate} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Interviewers</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedInterviewers.map((interviewer) => (
            <div
              key={interviewer.clerkId}
              className="inline-flex items-center gap-2 bg-secondary px-2 py-1 rounded-md text-sm"
            >
              <UserInfo user={interviewer} />
              {interviewer.clerkId !== user?.id && (
                <button
                  onClick={() => removeInterviewer(interviewer.clerkId)}
                  className="hover:text-destructive transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {availableInterviewers.length > 0 && (
          <Select onValueChange={addInterviewer}>
            <SelectTrigger>
              <SelectValue placeholder="Add interviewer" />
            </SelectTrigger>
            <SelectContent>
              {availableInterviewers.map((interviewer) => (
                <SelectItem key={interviewer.clerkId} value={interviewer.clerkId}>
                  <UserInfo user={interviewer} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Calendar
            mode="single"
            selected={formData.date}
            onSelect={(date) => date && setFormData({ ...formData, date })}
            disabled={(date) => date < new Date()}
            className="rounded-md border"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Time</label>
          <Input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 border rounded-md p-4">
        <div>
          <label className="text-sm font-medium">Problems (Optional)</label>
          <p className="text-xs text-muted-foreground mt-1">
            Select predefined problems or add a custom problem for this interview.
          </p>
        </div>

        {selectedProblems.length > 0 && (
          <div className="space-y-2">
            {selectedProblems.map((problem, index) => {
              const predefinedTitle =
                problem.type === "predefined"
                  ? predefinedProblems.find((item) => item._id === problem.problemId)?.title ||
                    "Predefined Problem"
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeProblemAt(index)}>
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
            <Select value={selectedPredefinedProblemId} onValueChange={setSelectedPredefinedProblemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a predefined problem" />
              </SelectTrigger>
              <SelectContent>
                {predefinedProblems.map((problem) => (
                  <SelectItem key={problem._id} value={problem._id}>
                    {problem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            onChange={(e) => setCustomProblem((prev) => ({ ...prev, title: e.target.value }))}
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

      <div className="flex justify-end gap-3 pt-4">
        {!embedded && (
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        )}
        <Button onClick={scheduleMeeting} disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Scheduling...
            </>
          ) : (
            "Schedule Interview"
          )}
        </Button>
      </div>
    </div>
  );

  if (embedded) {
    return <div>{renderForm()}</div>;
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        {/* HEADER INFO */}
        <div>
          <h1 className="text-3xl font-bold">Interviews</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage interviews</p>
        </div>

        {/* DIALOG */}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg">Schedule Interview</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px] h-[calc(100vh-200px)] overflow-auto">
            <DialogHeader>
              <DialogTitle>Schedule Interview</DialogTitle>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </div>

      {/* LOADING STATE & MEETING CARDS */}
      {interviews === undefined ? (
        <div className="flex justify-center py-12">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : interviews.length > 0 ? (
        <div className="spacey-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {interviews.map((interview) => (
              <MeetingCard key={interview._id} interview={interview} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No interviews scheduled</div>
      )}
    </div>
  );
}
export default InterviewScheduleUI;
