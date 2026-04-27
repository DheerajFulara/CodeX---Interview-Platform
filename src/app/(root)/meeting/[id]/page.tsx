"use client";

import LoaderUI from "@/components/LoaderUI";
import MeetingRoom from "@/components/MeetingRoom";
import MeetingSetup from "@/components/MeetingSetup";
import useGetCallById from "@/hooks/useGetCallById";
import { api } from "../../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { StreamCall, StreamTheme } from "@stream-io/video-react-sdk";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function MeetingPage() {
  const { id } = useParams();
  const { user, isLoaded } = useUser();
  const { call, isCallLoading } = useGetCallById(id);
  const interview = useQuery(api.interviews.getInterviewByStreamCallId, {
    streamCallId: typeof id === "string" ? id : id[0],
  });

  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    document.body.classList.add("meeting-active");

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.body.classList.remove("meeting-active");
    };
  }, []);

  if (!isLoaded || isCallLoading) return <LoaderUI />;

  const normalizedUserEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const normalizedCandidateEmail = interview?.candidateEmail?.toLowerCase();
  const canAccessScheduledInterview =
    !interview ||
    interview.candidateId === user?.id ||
    interview.interviewerIds.includes(user?.id || "") ||
    (Boolean(normalizedCandidateEmail) && normalizedCandidateEmail === normalizedUserEmail);

  if (!canAccessScheduledInterview) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-2xl font-semibold">You are not authorized to join this meeting</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-2xl font-semibold">Meeting not found</p>
      </div>
    );
  }

  return (
    <StreamCall call={call}>
      <StreamTheme>
        {!isSetupComplete ? (
          <MeetingSetup onSetupComplete={() => setIsSetupComplete(true)} />
        ) : (
          <MeetingRoom />
        )}
      </StreamTheme>
    </StreamCall>
  );
}
export default MeetingPage;
