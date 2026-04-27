"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Loader2Icon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useUserRole } from "@/hooks/useUserRole";

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
  const socketRef = useRef<Socket | null>(null);
  const excalidrawApiRef = useRef<any>(null);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressEmitSnapshotRef = useRef<string | null>(null);
  const pendingRemoteSnapshotRef = useRef<string | null>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const socket: Socket = io({
      path: "/api/socketio",
      query: { roomId },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });

    socketRef.current = socket;
    setIsConnected(false);
    setIsBooting(true);

    const applyRemoteState = (nextElements: any[]) => {
      const snapshot = JSON.stringify(nextElements ?? []);
      suppressEmitSnapshotRef.current = snapshot;
      pendingRemoteSnapshotRef.current = snapshot;
      setElements(nextElements ?? []);

      if (excalidrawApiRef.current) {
        excalidrawApiRef.current.updateScene({ elements: nextElements ?? [] });
        pendingRemoteSnapshotRef.current = null;
      }
    };

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("whiteboard:state", (state: WhiteboardRoomState) => {
      applyRemoteState(state?.elements ?? []);
      setIsBooting(false);
    });

    socket.on("whiteboard:update", (state: WhiteboardRoomState) => {
      applyRemoteState(state?.elements ?? []);
      setIsBooting(false);
    });

    socket.on("whiteboard:clear", () => {
      applyRemoteState([]);
      setIsBooting(false);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    const bootstrapAndConnect = async () => {
      try {
        await fetch("/api/socketio");
        socket.connect();
      } catch (error) {
        console.error("Failed to bootstrap whiteboard socket server:", error);
        setIsBooting(false);
      }
    };

    void bootstrapAndConnect();

    return () => {
      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!excalidrawApiRef.current || pendingRemoteSnapshotRef.current === null) return;
    excalidrawApiRef.current.updateScene({ elements });
    pendingRemoteSnapshotRef.current = null;
  }, [elements]);

  const emitWhiteboardUpdate = (nextElements: any[]) => {
    const snapshot = JSON.stringify(nextElements ?? []);
    if (snapshot === suppressEmitSnapshotRef.current) {
      suppressEmitSnapshotRef.current = null;
      return;
    }

    setElements(nextElements ?? []);

    if (emitTimerRef.current) {
      clearTimeout(emitTimerRef.current);
    }

    emitTimerRef.current = setTimeout(() => {
      socketRef.current?.emit("whiteboard:update", {
        roomId,
        elements: nextElements ?? [] ,
      });
    }, 90);
  };

  const clearBoard = () => {
    const nextElements: any[] = [];
    setElements(nextElements);
    suppressEmitSnapshotRef.current = JSON.stringify(nextElements);
    if (excalidrawApiRef.current) {
      excalidrawApiRef.current.updateScene({ elements: nextElements });
    }
    socketRef.current?.emit("whiteboard:clear", { roomId });
  };

  return (
    <div className="h-full rounded-xl border border-border/70 bg-background shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/40 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Whiteboard</h3>
          <p className="text-xs text-muted-foreground">
            {isConnected ? "Live sync enabled" : "Connecting to whiteboard..."}
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
        {isBooting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="h-full w-full">
          <Excalidraw
            excalidrawAPI={(api: any) => {
              excalidrawApiRef.current = api;
              if (pendingRemoteSnapshotRef.current !== null) {
                api.updateScene({ elements });
                pendingRemoteSnapshotRef.current = null;
              }
            }}
            theme="dark"
            onChange={(nextElements: any[]) => {
              emitWhiteboardUpdate(nextElements ?? []);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Whiteboard;
