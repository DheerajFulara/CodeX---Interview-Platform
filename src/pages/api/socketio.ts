import type { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";

type WhiteboardRoomState = {
  elements: any[];
  updatedAt: number;
};

type ProblemVisibilityState = {
  isVisible: boolean;
  updatedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __whiteboardSocketServer: SocketIOServer | undefined;
  // eslint-disable-next-line no-var
  var __whiteboardRoomState: Map<string, WhiteboardRoomState> | undefined;
  // eslint-disable-next-line no-var
  var __problemVisibilityState: Map<string, ProblemVisibilityState> | undefined;
}

const getRoomStateStore = () => {
  if (!globalThis.__whiteboardRoomState) {
    globalThis.__whiteboardRoomState = new Map<string, WhiteboardRoomState>();
  }

  return globalThis.__whiteboardRoomState;
};

const getProblemVisibilityStore = () => {
  if (!globalThis.__problemVisibilityState) {
    globalThis.__problemVisibilityState = new Map<string, ProblemVisibilityState>();
  }

  return globalThis.__problemVisibilityState;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const socket = res.socket;
  if (!socket) {
    res.status(500).end();
    return;
  }

  const socketServer = (socket as any).server as { io?: SocketIOServer } | undefined;
  if (!socketServer) {
    res.status(500).end();
    return;
  }

  if (!socketServer.io) {
    const io = new SocketIOServer((socket as any).server, {
      path: "/api/socketio",
    });

    const roomStateStore = getRoomStateStore();
    const problemVisibilityStore = getProblemVisibilityStore();

    io.on("connection", (socket) => {
      const roomId = typeof socket.handshake.query.roomId === "string" ? socket.handshake.query.roomId : "";

      if (!roomId) {
        socket.disconnect(true);
        return;
      }

      socket.join(roomId);

      const currentState = roomStateStore.get(roomId) ?? {
        elements: [],
        updatedAt: Date.now(),
      };

      socket.emit("whiteboard:state", currentState);

      const currentProblemState = problemVisibilityStore.get(roomId) ?? {
        isVisible: false,
        updatedAt: Date.now(),
      };
      socket.emit("problem:state", currentProblemState);

      socket.on("problem:toggle", (payload: { isVisible: boolean }) => {
        const nextState: ProblemVisibilityState = {
          isVisible: payload.isVisible,
          updatedAt: Date.now(),
        };
        problemVisibilityStore.set(roomId, nextState);
        io.to(roomId).emit("problem:toggle", nextState);
      });

      socket.on("whiteboard:update", (payload: { roomId?: string; elements: any[] }) => {
        const targetRoomId = payload.roomId || roomId;
        if (!targetRoomId) return;

        const nextState = {
          elements: payload.elements ?? [],
          updatedAt: Date.now(),
        };

        roomStateStore.set(targetRoomId, nextState);
        socket.to(targetRoomId).emit("whiteboard:update", nextState);
      });

      socket.on("whiteboard:clear", (payload: { roomId?: string }) => {
        const targetRoomId = payload.roomId || roomId;
        if (!targetRoomId) return;

        const nextState = {
          elements: [],
          updatedAt: Date.now(),
        };

        roomStateStore.set(targetRoomId, nextState);
        socket.to(targetRoomId).emit("whiteboard:clear", nextState);
      });
    });

    socketServer.io = io;
    globalThis.__whiteboardSocketServer = io;
  }

  res.end();
}
