import type { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";

type WhiteboardRoomState = {
  elements: any[];
  updatedAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __whiteboardSocketServer: SocketIOServer | undefined;
  // eslint-disable-next-line no-var
  var __whiteboardRoomState: Map<string, WhiteboardRoomState> | undefined;
}

const getRoomStateStore = () => {
  if (!globalThis.__whiteboardRoomState) {
    globalThis.__whiteboardRoomState = new Map<string, WhiteboardRoomState>();
  }

  return globalThis.__whiteboardRoomState;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const socketServer = res.socket.server as typeof res.socket.server & {
    io?: SocketIOServer;
  };

  if (!socketServer.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socketio",
    });

    const roomStateStore = getRoomStateStore();

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
