import { DEFAULT_MATCH_SIZE, TICK_RATE, WORLD_HEIGHT, WORLD_WIDTH, createPlayer, generateMap, tickMatch, type RuntimeMatch } from "@surviv/shared";
import type { MatchSnapshot, PlayerInput, QueueMode } from "@surviv/shared";
import { createBotInput } from "./BotFactory";

export class GameRoom {
  readonly id: string;
  private runtime: RuntimeMatch;
  private botIds = new Set<string>();

  constructor(id: string, readonly mode: QueueMode) {
    this.id = id;
    this.runtime = {
      snapshot: {
        id,
        mode,
        startedAt: Date.now(),
        players: [],
        projectiles: [],
        loot: [],
        map: generateMap(),
        killFeed: [],
        zone: {
          center: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
          radius: 1200,
          phase: 0,
          nextShrinkAt: Date.now() + 45_000
        }
      },
      playersById: new Map()
    };
    this.runtime.snapshot.loot = [...this.runtime.snapshot.map.loot];
  }

  addPlayer(id: string, name: string, isBot = false): MatchSnapshot {
    if (this.runtime.playersById.has(id)) {
      return this.runtime.snapshot;
    }
    const player = createPlayer(id, name, {
      x: 200 + Math.random() * (WORLD_WIDTH - 400),
      y: 200 + Math.random() * (WORLD_HEIGHT - 400)
    }, isBot);
    this.runtime.playersById.set(id, player);
    if (isBot) {
      this.botIds.add(id);
    }
    this.syncPlayers();
    return this.runtime.snapshot;
  }

  removePlayer(id: string): void {
    this.runtime.playersById.delete(id);
    this.syncPlayers();
  }

  applyInput(playerId: string, input: PlayerInput): void {
    const player = this.runtime.playersById.get(playerId);
    if (!player) {
      return;
    }
    player.input = input;
  }

  tick(now: number): MatchSnapshot {
    for (const player of this.runtime.playersById.values()) {
      if (player.isBot && player.alive) {
        player.input = createBotInput(Math.random());
      }
    }
    tickMatch(this.runtime, now, 1 / TICK_RATE);
    this.syncPlayers();
    return this.runtime.snapshot;
  }

  getSnapshot(): MatchSnapshot {
    return this.runtime.snapshot;
  }

  isReadyToStart(): boolean {
    return this.runtime.playersById.size >= Math.min(DEFAULT_MATCH_SIZE, 8);
  }

  playerCount(): number {
    return this.runtime.playersById.size;
  }

  ensureBots(count: number): void {
    const currentBots = [...this.runtime.playersById.values()].filter((player) => player.isBot).length;
    for (let index = currentBots; index < count; index += 1) {
      this.addPlayer(`bot-${this.id}-${index}`, `Bot ${index + 1}`, true);
    }
  }

  private syncPlayers(): void {
    this.runtime.snapshot.players = Array.from(this.runtime.playersById.values()).map(({ input: _input, lastShotAt: _lastShotAt, ...player }) => player);
  }
}
