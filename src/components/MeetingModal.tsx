import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import useMeetingActions from "@/hooks/useMeetingActions";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Textarea } from "./ui/textarea";
import { useUserRole } from "@/hooks/useUserRole";
import toast from "react-hot-toast";

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isJoinMeeting: boolean;
}

type SelectedProblem =
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

function MeetingModal({ isOpen, onClose, title, isJoinMeeting }: MeetingModalProps) {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>([]);
  const [selectedPredefinedProblemId, setSelectedPredefinedProblemId] = useState("");
  const [customProblem, setCustomProblem] = useState({
    title: "",
    description: "",
    exampleInput: "",
    exampleOutput: "",
    exampleExplanation: "",
    constraintsText: "",
  });
  const predefinedProblems = useQuery(api.problems.getAllProblems) ?? [];
  const { isInterviewer } = useUserRole();
  const { createInstantMeeting, joinMeeting } = useMeetingActions();

  const resetForm = () => {
    setMeetingUrl("");
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
  };

  const addPredefinedProblem = () => {
    if (!selectedPredefinedProblemId) return;

    const alreadyAdded = selectedProblems.some(
      (problem) =>
        problem.type === "predefined" && String(problem.problemId) === String(selectedPredefinedProblemId)
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

  const handleStart = async () => {
    if (isJoinMeeting) {
      // if it's a full URL extract meeting ID
      const meetingId = meetingUrl.split("/").pop();
      if (meetingId) joinMeeting(meetingId);
    } else {
      await createInstantMeeting(selectedProblems);
    }

    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={isJoinMeeting ? "sm:max-w-[425px]" : "sm:max-w-[700px] max-h-[85vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isJoinMeeting && (
            <Input
              placeholder="Paste meeting link here..."
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          )}

          {!isJoinMeeting && isInterviewer && (
            <div className="space-y-3 border rounded-md p-4">
              <div>
                <p className="text-sm font-medium">Problems (Optional)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select predefined problems or add custom problems before starting this call.
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
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={isJoinMeeting && !meetingUrl.trim()}>
              {isJoinMeeting ? "Join Meeting" : "Start Meeting"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export default MeetingModal;
