import Phaser from "phaser";
import type { MatchSnapshot, PlayerInput } from "@surviv/shared";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "../../lib/api";

export class BattleScene extends Phaser.Scene {
  private socket?: Socket;
  private localPlayerId?: string;
  private playerSprites = new Map<string, Phaser.GameObjects.Container>();
  private lootSprites = new Map<string, Phaser.GameObjects.Arc>();
  private mapSeed?: number;
  private terrainLayer?: Phaser.GameObjects.Graphics;
  private zoneRing?: Phaser.GameObjects.Graphics;
  private fogMask?: Phaser.GameObjects.Graphics;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private reloadKey?: Phaser.Input.Keyboard.Key;
  private readonly onReadyStateChange: (ready: boolean) => void;
  private readonly onSnapshot: (snapshot: MatchSnapshot) => void;

  constructor(onReadyStateChange: (ready: boolean) => void, onSnapshot: (snapshot: MatchSnapshot) => void) {
    super("battle");
    this.onReadyStateChange = onReadyStateChange;
    this.onSnapshot = onSnapshot;
  }

  create(): void {
    this.keys = this.input.keyboard?.addKeys("W,A,S,D,E") as Record<string, Phaser.Input.Keyboard.Key>;
    this.reloadKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.drawArena();
    this.onReadyStateChange(true);
    this.events.on("shutdown", () => this.socket?.disconnect());
  }

  attach(token: string, mode: "solo" | "duo" | "squad", localPlayerId: string): void {
    this.socket?.disconnect();
    this.localPlayerId = localPlayerId;
    this.socket = io(API_URL, { auth: { token } });
    this.socket.on("connect", () => {
      this.socket?.emit("queue:join", mode);
    });
    this.socket.on("match:snapshot", (snapshot: MatchSnapshot) => {
      this.onSnapshot(snapshot);
      this.renderSnapshot(snapshot);
    });
  }

  update(): void {
    if (!this.socket || !this.socket.connected || !this.input.activePointer) {
      return;
    }

    const input: PlayerInput = {
      seq: Date.now(),
      movement: {
        x: Number(this.keys?.D.isDown) - Number(this.keys?.A.isDown),
        y: Number(this.keys?.S.isDown) - Number(this.keys?.W.isDown)
      },
      aim: {
        x: this.input.activePointer.worldX - this.scale.width / 2,
        y: this.input.activePointer.worldY - this.scale.height / 2
      },
      firing: this.input.activePointer.isDown,
      reload: Boolean(this.reloadKey?.isDown),
      pickup: Boolean(this.keys?.E.isDown)
    };

    this.socket.emit("player:input", input);
  }

  private drawArena(): void {
    this.terrainLayer = this.add.graphics();
    this.zoneRing = this.add.graphics();
    this.fogMask = this.add.graphics();
  }

  private renderSnapshot(snapshot: MatchSnapshot): void {
    const localPlayer = snapshot.players.find((player) => player.id === this.localPlayerId);
    const focusPlayer =
      (localPlayer?.alive ? localPlayer : snapshot.players.find((player) => player.alive)) ??
      localPlayer ??
      snapshot.players[0];
    if (!focusPlayer) {
      return;
    }
    if (snapshot.map.seed !== this.mapSeed) {
      this.mapSeed = snapshot.map.seed;
    }
    const worldToScreen = (x: number, y: number) => ({
      x: (x - focusPlayer.position.x) * 0.34 + this.scale.width / 2,
      y: (y - focusPlayer.position.y) * 0.34 + this.scale.height / 2
    });

    this.redrawMap(snapshot, worldToScreen);
    this.zoneRing?.clear();
    this.zoneRing?.lineStyle(3, 0xff6666, 0.95);
    this.zoneRing?.strokeCircle(this.scale.width / 2, this.scale.height / 2, snapshot.zone.radius * 0.34);

    for (const player of snapshot.players) {
      let container = this.playerSprites.get(player.id);
      if (!container) {
        const body = this.add.circle(0, 0, 15, player.isBot ? 0xff6d5f : 0xeafaea);
        const barrel = this.add.rectangle(15, 0, 20, 4, 0x1b1b1b);
        const label = this.add.text(0, -28, player.name, { fontSize: "12px", color: "#ffffff" }).setOrigin(0.5);
        container = this.add.container(0, 0, [body, barrel, label]);
        this.playerSprites.set(player.id, container);
      }
      const screen = worldToScreen(player.position.x, player.position.y);
      container.setVisible(player.alive);
      container.setPosition(screen.x, screen.y);
      container.setRotation(player.rotation);
      const inVision = Math.hypot(player.position.x - focusPlayer.position.x, player.position.y - focusPlayer.position.y) < 780;
      container.setAlpha(player.alive ? (inVision ? 1 : 0.18) : 0.18);
    }

    for (const [id, sprite] of this.playerSprites) {
      if (!snapshot.players.find((player) => player.id === id)) {
        sprite.destroy();
        this.playerSprites.delete(id);
      }
    }

    for (const item of snapshot.loot) {
      let marker = this.lootSprites.get(item.id);
      if (!marker) {
        marker = this.add.circle(0, 0, 4, item.kind === "weapon" ? 0xf9d65c : item.kind === "healing" ? 0x84f0ac : 0x9fd4ff);
        this.lootSprites.set(item.id, marker);
      }
      const screen = worldToScreen(item.position.x, item.position.y);
      marker.setPosition(screen.x, screen.y);
      marker.setAlpha(Math.hypot(item.position.x - focusPlayer.position.x, item.position.y - focusPlayer.position.y) < 520 ? 0.9 : 0.2);
    }

    for (const [id, sprite] of this.lootSprites) {
      if (!snapshot.loot.find((item) => item.id === id)) {
        sprite.destroy();
        this.lootSprites.delete(id);
      }
    }

    this.drawFog();
  }

  private redrawMap(snapshot: MatchSnapshot, worldToScreen: (x: number, y: number) => { x: number; y: number }): void {
    if (!this.terrainLayer) {
      return;
    }

    const graphics = this.terrainLayer;
    graphics.clear();
    graphics.fillStyle(0x2f6037, 1);
    graphics.fillRect(0, 0, this.scale.width, this.scale.height);

    for (const tile of snapshot.map.waterTiles) {
      graphics.fillStyle(0x22658a, 0.38);
      const screen = worldToScreen(tile.x, tile.y);
      graphics.fillCircle(screen.x, screen.y, 28);
    }

    for (const building of snapshot.map.buildings) {
      const origin = worldToScreen(building.x, building.y);
      graphics.fillStyle(0x6d5139, 0.88);
      graphics.fillRect(
        origin.x,
        origin.y,
        building.width * 0.34,
        building.height * 0.34
      );
    }

    for (const obstacle of snapshot.map.obstacles) {
      const screen = worldToScreen(obstacle.x, obstacle.y);
      graphics.fillStyle(obstacle.destructible ? 0xbf8c55 : 0x9fa4aa, 0.8);
      graphics.fillCircle(screen.x, screen.y, Math.max(6, obstacle.radius * 0.34));
    }
  }

  private drawFog(): void {
    if (!this.fogMask) {
      return;
    }

    this.fogMask.clear();
    this.fogMask.fillStyle(0x07110b, 0.66);
    this.fogMask.fillRect(0, 0, this.scale.width, Math.max(0, this.scale.height / 2 - 220));
    this.fogMask.fillRect(0, this.scale.height / 2 + 220, this.scale.width, Math.max(0, this.scale.height / 2 - 220));
    this.fogMask.fillRect(0, this.scale.height / 2 - 220, Math.max(0, this.scale.width / 2 - 220), 440);
    this.fogMask.fillRect(this.scale.width / 2 + 220, this.scale.height / 2 - 220, Math.max(0, this.scale.width / 2 - 220), 440);
  }
}
