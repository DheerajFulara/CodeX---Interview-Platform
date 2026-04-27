"use client";

import LoaderUI from "@/components/LoaderUI";
import RecordingCard from "@/components/RecordingCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserRole } from "@/hooks/useUserRole";
import useGetCalls from "@/hooks/useGetCalls";
import { CallRecording } from "@stream-io/video-react-sdk";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

function RecordingsPage() {
  const { calls, isLoading } = useGetCalls();
  const { isInterviewer } = useUserRole();
  const hiddenRecordingKeys = useQuery(api.recordingDeletions.getMyHiddenRecordingUrls) ?? [];
  const hideRecording = useMutation(api.recordingDeletions.hideRecording);
  const [allRecordings, setAllRecordings] = useState<CallRecording[]>([]);
  const [locallyDeletedRecordingUrls, setLocallyDeletedRecordingUrls] = useState<string[]>([]);
  const [recordingToDelete, setRecordingToDelete] = useState<CallRecording | null>(null);

  const recordings = allRecordings.filter(
    (recording) =>
      !hiddenRecordingKeys.includes(recording.url) &&
      !hiddenRecordingKeys.includes(recording.filename) &&
      !locallyDeletedRecordingUrls.includes(recording.url) &&
      !locallyDeletedRecordingUrls.includes(recording.filename)
  );

  useEffect(() => {
    const fetchRecordings = async () => {
      if (!calls) return;

      try {
        // Get recordings for each call
        const callData = await Promise.all(calls.map((call) => call.queryRecordings()));
        const nextRecordings = callData.flatMap((call) => call.recordings);

        setAllRecordings(nextRecordings);
      } catch (error) {
        console.log("Error fetching recordings:", error);
      }
    };

    fetchRecordings();
  }, [calls, hiddenRecordingKeys, locallyDeletedRecordingUrls]);

  const handleDeleteRecording = async () => {
    if (!recordingToDelete) return;

    try {
      await hideRecording({ recordingUrl: recordingToDelete.url });
      setLocallyDeletedRecordingUrls((current) => {
        const nextKeys = [recordingToDelete.url, recordingToDelete.filename];
        const merged = new Set(current);

        nextKeys.forEach((key) => merged.add(key));

        return Array.from(merged);
      });
      toast.success("Recording deleted from dashboard");
      setRecordingToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete recording");
    }
  };

  if (isLoading) return <LoaderUI />;

  return (
    <div className="container max-w-7xl mx-auto p-6">
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Recordings</h1>
          <p className="text-muted-foreground my-1">
            {recordings.length} {recordings.length === 1 ? "recording" : "recordings"} available
          </p>
        </div>

        {isInterviewer && (
          <Link href="/interviewer/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Interviewer Dashboard
            </Button>
          </Link>
        )}
      </div>

      {/* RECORDINGS GRID */}

      <ScrollArea className="h-[calc(100vh-12rem)] mt-3">
        {recordings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
            {recordings.map((r) => (
              <RecordingCard
                key={`${r.filename}-${r.end_time}`}
                recording={r}
                onDelete={isInterviewer ? setRecordingToDelete : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] gap-4">
            <p className="text-xl font-medium text-muted-foreground">No recordings available</p>
          </div>
        )}
      </ScrollArea>

      <Dialog
        open={!!recordingToDelete}
        onOpenChange={(open) => !open && setRecordingToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recording</DialogTitle>
            <DialogDescription>
              This recording will be removed from your dashboard list.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordingToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecording}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default RecordingsPage;
