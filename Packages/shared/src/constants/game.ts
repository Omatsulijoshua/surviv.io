export const WORLD_WIDTH = 2800;
export const WORLD_HEIGHT = 2800;
export const PLAYER_RADIUS = 18;
export const TICK_RATE = 60;
export const MAX_HEALTH = 100;
export const MAX_ARMOR = 100;
export const STARTING_WEAPON = "pistol";
export const DEFAULT_MATCH_SIZE = 20;
export const ZONE_PHASES = [
  { radius: 1200, durationMs: 45_000 },
  { radius: 900, durationMs: 40_000 },
  { radius: 650, durationMs: 35_000 },
  { radius: 420, durationMs: 30_000 },
  { radius: 220, durationMs: 20_000 }
] as const;
