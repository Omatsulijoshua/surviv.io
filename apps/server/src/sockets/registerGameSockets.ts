import type { Server } from "socket.io";
import type { PlayerInput, QueueMode } from "@surviv/shared";
import { verifyToken } from "../services/auth";
import { Matchmaker } from "../game/Matchmaker";
import { env } from "../config/env";

export function registerGameSockets(io: Server, matchmaker: Matchmaker): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (typeof token !== "string") {
      next(new Error("Missing auth token"));
      return;
    }

    try {
      socket.data.user = verifyToken(token);
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    socket.on("queue:join", (mode: QueueMode = "solo") => {
      const room = matchmaker.enqueue(mode, socket.data.user.sub, socket.data.user.displayName);
      socket.join(room.id);
      room.ensureBots(env.BOT_COUNT);

      io.to(room.id).emit("match:snapshot", room.getSnapshot());
    });

    socket.on("player:input", (input: PlayerInput) => {
      const room = matchmaker.getRoomForPlayer(socket.data.user.sub);
      room?.applyInput(socket.data.user.sub, input);
    });

    socket.on("disconnect", () => {
      const room = matchmaker.getRoomForPlayer(socket.data.user.sub);
      room?.removePlayer(socket.data.user.sub);
    });
  });
}
