import { useRouter } from "next/navigation";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type InstantMeetingProblem =
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

const useMeetingActions = () => {
  const router = useRouter();
  const client = useStreamVideoClient();
  const { user } = useUser();
  const createInterview = useMutation((api as any).interviews.createInterview);

  const createInstantMeeting = async (problems: InstantMeetingProblem[] = []) => {
    if (!client || !user?.id) return;

    try {
      const id = crypto.randomUUID();
      const call = client.call("default", id);

      await call.getOrCreate({
        data: {
          starts_at: new Date().toISOString(),
          custom: {
            description: "Instant Meeting",
          },
        },
      });

      try {
        await createInterview({
          title: "Instant Interview",
          description: "Started from New Call",
          startTime: Date.now(),
          status: "upcoming",
          streamCallId: id,
          candidateEmail: `instant-${id}@codex.local`,
          candidateId: undefined,
          interviewerIds: [user.id],
          problems,
        });
      } catch (error) {
        console.error("Failed to attach problems to instant meeting:", error);
      }

      router.push(`/meeting/${call.id}`);
      toast.success("Meeting Created");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create meeting");
    }
  };

  const joinMeeting = (callId: string) => {
    if (!client) return toast.error("Failed to join meeting. Please try again.");
    router.push(`/meeting/${callId}`);
  };

  return { createInstantMeeting, joinMeeting };
};

export default useMeetingActions;
