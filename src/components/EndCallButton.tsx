import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import toast from "react-hot-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useUserRole } from "@/hooks/useUserRole";

function EndCallButton() {
  const call = useCall();
  const router = useRouter();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const { isInterviewer } = useUserRole();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState("");
  const [strengths, setStrengths] = useState("");
  const [rating, setRating] = useState<string>("none");

  const updateInterviewStatus = useMutation(api.interviews.updateInterviewStatus);
  const submitFeedback = useMutation(api.feedbacks.submitInterviewFeedback);

  const interview = useQuery(api.interviews.getInterviewByStreamCallId, {
    streamCallId: call?.id || "",
  });

  if (!call || !interview) return null;

  const isMeetingOwner = localParticipant?.userId === call.state.createdBy?.id;

  if (!isMeetingOwner) return null;

  const finishMeeting = async () => {
    try {
      await call.endCall();

      await updateInterviewStatus({
        id: interview._id,
        status: "completed",
      });

      router.push("/");
      toast.success("Meeting ended for everyone");
    } catch (error) {
      console.log(error);
      toast.error("Failed to end meeting");
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await finishMeeting();
    setIsDialogOpen(false);
    setIsSubmitting(false);
  };

  const handleSubmitFeedback = async () => {
    if (!interview?.candidateId) {
      toast.error("Unable to find candidate for this interview");
      return;
    }

    const trimmedSuggestions = suggestions.trim();
    const trimmedStrengths = strengths.trim();
    const normalizedRating = rating === "none" ? undefined : Number(rating);

    if (!trimmedSuggestions && !trimmedStrengths && !normalizedRating) {
      toast.error("Please add at least one feedback field or click Skip");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFeedback({
        interviewId: interview._id,
        candidateId: interview.candidateId,
        suggestions: trimmedSuggestions || undefined,
        strengths: trimmedStrengths || undefined,
        rating: normalizedRating,
      });

      await finishMeeting();
      setIsDialogOpen(false);
      setSuggestions("");
      setStrengths("");
      setRating("none");
    } catch (error) {
      console.log(error);
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndMeetingClick = async () => {
    if (!isInterviewer) {
      await finishMeeting();
      return;
    }

    setIsDialogOpen(true);
  };

  return (
    <>
      <Button variant={"destructive"} onClick={handleEndMeetingClick}>
        End Meeting
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Post-Interview Feedback (Optional)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Suggestions for improvement</Label>
              <Textarea
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder="Share areas where the candidate can improve..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Strengths (Optional)</Label>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="Highlight what the candidate did well..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Rating (Optional)</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No rating</SelectItem>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <SelectItem key={value} value={value.toString()}>
                      {value} / 5
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={isSubmitting} onClick={handleSkip}>
              Skip & End Meeting
            </Button>
            <Button disabled={isSubmitting} onClick={handleSubmitFeedback}>
              Submit & End Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default EndCallButton;
