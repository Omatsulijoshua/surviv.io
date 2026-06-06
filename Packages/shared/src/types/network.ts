export type QueueMode = "solo" | "duo" | "squad";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerInput {
  seq: number;
  movement: Vec2;
  aim: Vec2;
  firing: boolean;
  reload: boolean;
  pickup: boolean;
}

export interface WeaponDefinition {
  id: "pistol" | "shotgun" | "assault_rifle" | "sniper";
  damage: number;
  ammoCapacity: number;
  fireRateMs: number;
  projectileSpeed: number;
  spread: number;
  pellets?: number;
}

export interface LootItem {
  id: string;
  kind: "ammo" | "weapon" | "healing" | "boost" | "armor";
  subtype: string;
  amount: number;
  position: Vec2;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  destructible: boolean;
  health: number;
}

export interface MapSeed {
  seed: number;
  buildings: Building[];
  loot: LootItem[];
  waterTiles: Vec2[];
  obstacles: Obstacle[];
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  health: number;
  armor: number;
  alive: boolean;
  ammo: Record<string, number>;
  weaponId: WeaponDefinition["id"];
  kills: number;
  teamId?: string;
  isBot?: boolean;
}

export interface ProjectileSnapshot {
  id: string;
  ownerId: string;
  position: Vec2;
  velocity: Vec2;
  damage: number;
}

export interface ZoneSnapshot {
  center: Vec2;
  radius: number;
  phase: number;
  nextShrinkAt: number;
}

export interface KillFeedEvent {
  id: string;
  killer: string;
  victim: string;
  weaponId: string;
  createdAt: number;
}

export interface MatchSnapshot {
  id: string;
  mode: QueueMode;
  startedAt: number;
  players: PlayerSnapshot[];
  projectiles: ProjectileSnapshot[];
  loot: LootItem[];
  zone: ZoneSnapshot;
  map: MapSeed;
  killFeed: KillFeedEvent[];
  winnerId?: string;
}
