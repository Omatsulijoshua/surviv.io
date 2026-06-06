import type { QueueMode } from "@surviv/shared";
import { env } from "../config/env";
import { GameRoom } from "./GameRoom";

type QueueEntry = { playerId: string; displayName: string };

export class Matchmaker {
  private queues: Record<QueueMode, QueueEntry[]> = { solo: [], duo: [], squad: [] };
  private rooms = new Map<string, GameRoom>();
  private playerRoom = new Map<string, string>();
  private sequence = 1;

  enqueue(mode: QueueMode, playerId: string, displayName: string): GameRoom {
    this.queues[mode].push({ playerId, displayName });
    const targetSize = mode === "solo" ? env.MAX_PLAYERS_PER_MATCH : mode === "duo" ? Math.max(8, Math.floor(env.MAX_PLAYERS_PER_MATCH / 2)) : Math.max(8, Math.floor(env.MAX_PLAYERS_PER_MATCH / 4));

    if (this.queues[mode].length < targetSize) {
      const room = this.findOpenRoom(mode) ?? this.createRoom(mode);
      room.addPlayer(playerId, displayName);
      this.playerRoom.set(playerId, room.id);
      this.queues[mode] = this.queues[mode].filter((entry) => entry.playerId !== playerId);
      return room;
    }

    const room = this.createRoom(mode);
    for (const entry of this.queues[mode].splice(0, targetSize)) {
      room.addPlayer(entry.playerId, entry.displayName);
      this.playerRoom.set(entry.playerId, room.id);
    }
    return room;
  }

  getRoomForPlayer(playerId: string): GameRoom | undefined {
    const roomId = this.playerRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRooms(): GameRoom[] {
    return [...this.rooms.values()];
  }

  private createRoom(mode: QueueMode): GameRoom {
    const room = new GameRoom(`match-${this.sequence += 1}`, mode);
    this.rooms.set(room.id, room);
    return room;
  }

  private findOpenRoom(mode: QueueMode): GameRoom | undefined {
    return [...this.rooms.values()].find((room) => room.mode === mode && room.playerCount() < env.MAX_PLAYERS_PER_MATCH);
  }
}
