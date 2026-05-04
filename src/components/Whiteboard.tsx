"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Loader2Icon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { api } from "../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

type WhiteboardRoomState = {
  elements: any[];
  updatedAt: number;
};

const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  { ssr: false }
);

type WhiteboardProps = {
  roomId: string;
  onClose: () => void;
};

function Whiteboard({ roomId, onClose }: WhiteboardProps) {
  const { isInterviewer } = useUserRole();
  const excalidrawApiRef = useRef<any>(null);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressEmitSnapshotRef = useRef<string | null>(null);
  const isApplyingRemoteStateRef = useRef(false);
  const lastAppliedSnapshotRef = useRef<string>("");
  const hasAppliedSceneRef = useRef(false);
  const [elements, setElements] = useState<any[]>([]);
  const [isLoadingOverlayVisible, setIsLoadingOverlayVisible] = useState(true);

  const whiteboardState = useQuery(
    (api as any).whiteboard.getWhiteboardStateByRoomId,
    roomId ? { roomId } : "skip"
  ) as WhiteboardRoomState | null | undefined;
  const upsertWhiteboardState = useMutation((api as any).whiteboard.upsertWhiteboardState);

  useEffect(() => {
    if (whiteboardState === undefined) {
      setIsLoadingOverlayVisible(true);
      return;
    }

    const nextElements = whiteboardState?.elements ?? [];
    const nextSnapshot = JSON.stringify(nextElements);

    if (nextSnapshot === lastAppliedSnapshotRef.current) {
      setIsLoadingOverlayVisible(false);
      return;
    }

    isApplyingRemoteStateRef.current = true;
    suppressEmitSnapshotRef.current = nextSnapshot;
    lastAppliedSnapshotRef.current = nextSnapshot;
    setElements(nextElements);

    if (excalidrawApiRef.current) {
      excalidrawApiRef.current.updateScene({ elements: nextElements });
      hasAppliedSceneRef.current = true;
    }

    queueMicrotask(() => {
      isApplyingRemoteStateRef.current = false;
    });

    setIsLoadingOverlayVisible(false);
  }, [whiteboardState]);

  useEffect(() => {
    if (!roomId) {
      setIsLoadingOverlayVisible(false);
      return;
    }

    const fallbackTimer = setTimeout(() => {
      setIsLoadingOverlayVisible(false);
    }, 2500);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
      }
    };
  }, []);

  const emitWhiteboardUpdate = (nextElements: readonly any[]) => {
    if (!roomId) return;

    const snapshot = JSON.stringify(nextElements ?? []);
    if (isApplyingRemoteStateRef.current) {
      return;
    }

    if (snapshot === suppressEmitSnapshotRef.current) {
      suppressEmitSnapshotRef.current = null;
      return;
    }

    if (snapshot === lastAppliedSnapshotRef.current) {
      return;
    }

    lastAppliedSnapshotRef.current = snapshot;
    setElements([...(nextElements ?? [])]);

    if (emitTimerRef.current) {
      clearTimeout(emitTimerRef.current);
    }

    emitTimerRef.current = setTimeout(() => {
      void upsertWhiteboardState({
        roomId,
        elements: [...(nextElements ?? [])],
      }).catch((error) => {
        console.error("Failed to update whiteboard state:", error);
      });
    }, 90);
  };

  const clearBoard = () => {
    const nextElements: any[] = [];
    isApplyingRemoteStateRef.current = true;
    setElements(nextElements);
    suppressEmitSnapshotRef.current = JSON.stringify(nextElements);
    lastAppliedSnapshotRef.current = JSON.stringify(nextElements);

    if (excalidrawApiRef.current) {
      excalidrawApiRef.current.updateScene({ elements: nextElements });
      hasAppliedSceneRef.current = true;
    }

    queueMicrotask(() => {
      isApplyingRemoteStateRef.current = false;
    });

    void upsertWhiteboardState({ roomId, elements: nextElements }).catch((error) => {
      console.error("Failed to clear whiteboard state:", error);
    });
  };

  return (
    <div className="h-full rounded-xl border border-border/70 bg-background shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/40 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Whiteboard</h3>
          <p className="text-xs text-muted-foreground">
            {isLoadingOverlayVisible ? "Loading whiteboard..." : "Live sync enabled"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isInterviewer && (
            <Button type="button" variant="outline" size="sm" onClick={clearBoard}>
              <Trash2Icon className="mr-2 size-4" />
              Clear Canvas
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        {isLoadingOverlayVisible && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="h-full w-full">
          <Excalidraw
            excalidrawAPI={(apiInstance: any) => {
              excalidrawApiRef.current = apiInstance;
              const snapshot = JSON.stringify(elements);
              if (hasAppliedSceneRef.current && snapshot === lastAppliedSnapshotRef.current) {
                return;
              }

              isApplyingRemoteStateRef.current = true;
              apiInstance.updateScene({ elements });
              hasAppliedSceneRef.current = true;
              queueMicrotask(() => {
                isApplyingRemoteStateRef.current = false;
              });
            }}
            theme="dark"
            onChange={(nextElements) => {
              emitWhiteboardUpdate(nextElements);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;
