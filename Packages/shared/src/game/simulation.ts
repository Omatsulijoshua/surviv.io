import { MAX_ARMOR, MAX_HEALTH, PLAYER_RADIUS, STARTING_WEAPON, WORLD_HEIGHT, WORLD_WIDTH, ZONE_PHASES } from "../constants/game";
import type { LootItem, MatchSnapshot, PlayerInput, PlayerSnapshot, ProjectileSnapshot, Vec2 } from "../types/network";
import { weapons } from "./weapons";

export interface RuntimePlayer extends PlayerSnapshot {
  input?: PlayerInput;
  lastShotAt: number;
}

export interface RuntimeMatch {
  snapshot: MatchSnapshot;
  playersById: Map<string, RuntimePlayer>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function length(vector: Vec2): number {
  return Math.hypot(vector.x, vector.y);
}

function normalize(vector: Vec2): Vec2 {
  const magnitude = length(vector) || 1;
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function createPlayer(id: string, name: string, position: Vec2, isBot = false): RuntimePlayer {
  return {
    id,
    name,
    position,
    velocity: { x: 0, y: 0 },
    rotation: 0,
    health: MAX_HEALTH,
    armor: 0,
    alive: true,
    ammo: {
      pistol: 48,
      shotgun: 12,
      assault_rifle: 90,
      sniper: 10
    },
    weaponId: STARTING_WEAPON,
    kills: 0,
    isBot,
    lastShotAt: 0
  };
}

export function tickMatch(runtime: RuntimeMatch, now: number, deltaSeconds: number): RuntimeMatch {
  const nextProjectiles: ProjectileSnapshot[] = [];
  const nextKillFeed = [...runtime.snapshot.killFeed];
  const players = Array.from(runtime.playersById.values());
  const survivingProjectiles: ProjectileSnapshot[] = [];

  for (const player of players) {
    if (!player.alive || !player.input) {
      continue;
    }

    const speed = isInWater(player.position, runtime.snapshot.map.waterTiles) ? 165 : 240;
    const movement = normalize(player.input.movement);
    player.velocity = { x: movement.x * speed, y: movement.y * speed };
    const proposedPosition = {
      x: clamp(player.position.x + player.velocity.x * deltaSeconds, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS),
      y: clamp(player.position.y + player.velocity.y * deltaSeconds, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS)
    };
    player.position = resolveWorldCollision(proposedPosition, runtime.snapshot.map);
    player.rotation = Math.atan2(player.input.aim.y, player.input.aim.x);

    const weapon = weapons[player.weaponId];
    const canShoot = player.input.firing && now - player.lastShotAt >= weapon.fireRateMs && player.ammo[player.weaponId] > 0;

    if (canShoot) {
      player.lastShotAt = now;
      player.ammo[player.weaponId] -= 1;
      const pellets = weapon.pellets ?? 1;

      for (let i = 0; i < pellets; i += 1) {
        const spread = (Math.random() - 0.5) * weapon.spread;
        const angle = player.rotation + spread;
        nextProjectiles.push({
          id: `${player.id}-${now}-${i}`,
          ownerId: player.id,
          position: { ...player.position },
          velocity: {
            x: Math.cos(angle) * weapon.projectileSpeed,
            y: Math.sin(angle) * weapon.projectileSpeed
          },
          damage: weapon.damage
        });
      }
    }
  }

  for (const projectile of [...runtime.snapshot.projectiles, ...nextProjectiles]) {
    projectile.position.x += projectile.velocity.x * deltaSeconds;
    projectile.position.y += projectile.velocity.y * deltaSeconds;

    if (projectile.position.x < 0 || projectile.position.y < 0 || projectile.position.x > WORLD_WIDTH || projectile.position.y > WORLD_HEIGHT) {
      continue;
    }

    if (collidesWithBuilding(projectile.position, runtime.snapshot.map)) {
      continue;
    }

    const obstacle = runtime.snapshot.map.obstacles.find(
      (item) => Math.hypot(item.x - projectile.position.x, item.y - projectile.position.y) <= item.radius
    );
    if (obstacle) {
      if (obstacle.destructible) {
        obstacle.health -= projectile.damage;
      }
      continue;
    }

    let hitTarget = false;

    for (const target of players) {
      if (!target.alive || target.id === projectile.ownerId) {
        continue;
      }

      const distance = Math.hypot(target.position.x - projectile.position.x, target.position.y - projectile.position.y);
      if (distance > PLAYER_RADIUS) {
        continue;
      }

      const armorAbsorb = Math.min(target.armor, projectile.damage * 0.45);
      target.armor = clamp(target.armor - armorAbsorb, 0, MAX_ARMOR);
      target.health = clamp(target.health - (projectile.damage - armorAbsorb), 0, MAX_HEALTH);
      hitTarget = true;

      if (target.health <= 0) {
        target.alive = false;
        const killer = runtime.playersById.get(projectile.ownerId);
        if (killer) {
          killer.kills += 1;
        }
        nextKillFeed.unshift({
          id: `kill-${projectile.id}`,
          killer: killer?.name ?? "Unknown",
          victim: target.name,
          weaponId: killer?.weaponId ?? "unknown",
          createdAt: now
        });
      }
      break;
    }

    if (!hitTarget) {
      survivingProjectiles.push(projectile);
    }
  }

  applyZoneDamage(runtime, now, deltaSeconds);
  pruneLoot(runtime.snapshot.loot, players);
  runtime.snapshot.map.obstacles = runtime.snapshot.map.obstacles.filter((obstacle) => !obstacle.destructible || obstacle.health > 0);

  runtime.snapshot.players = players.map(({ input: _input, lastShotAt: _lastShotAt, ...publicState }) => publicState);
  runtime.snapshot.projectiles = survivingProjectiles.slice(-120);
  runtime.snapshot.killFeed = nextKillFeed.slice(0, 8);
  runtime.snapshot.zone = computeZone(runtime.snapshot.startedAt, now);

  const livingPlayers = runtime.snapshot.players.filter((player) => player.alive);
  if (livingPlayers.length === 1) {
    runtime.snapshot.winnerId = livingPlayers[0].id;
  }

  return runtime;
}

function pruneLoot(loot: LootItem[], players: RuntimePlayer[]): void {
  for (const player of players) {
    if (!player.input?.pickup || !player.alive) {
      continue;
    }

    const index = loot.findIndex((item) => Math.hypot(item.position.x - player.position.x, item.position.y - player.position.y) < 42);
    if (index === -1) {
      continue;
    }

    const item = loot[index];
    if (item.kind === "weapon") {
      player.weaponId = item.subtype as RuntimePlayer["weaponId"];
    } else if (item.kind === "healing") {
      player.health = clamp(player.health + (item.subtype === "medkit" ? 40 : 18), 0, MAX_HEALTH);
    } else if (item.kind === "armor") {
      player.armor = clamp(player.armor + item.amount, 0, MAX_ARMOR);
    } else {
      player.ammo[player.weaponId] += item.amount;
    }

    loot.splice(index, 1);
  }
}

function computeZone(startedAt: number, now: number) {
  const matchElapsed = Math.max(0, now - startedAt);
  let elapsed = 0;
  for (let phase = 0; phase < ZONE_PHASES.length; phase += 1) {
    elapsed += ZONE_PHASES[phase].durationMs;
    if (matchElapsed <= elapsed) {
      return {
        center: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
        radius: ZONE_PHASES[phase].radius,
        phase,
        nextShrinkAt: startedAt + elapsed
      };
    }
  }

  const last = ZONE_PHASES[ZONE_PHASES.length - 1];
  return {
    center: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
    radius: last.radius,
    phase: ZONE_PHASES.length - 1,
    nextShrinkAt: startedAt + elapsed
  };
}

function applyZoneDamage(runtime: RuntimeMatch, now: number, deltaSeconds: number): void {
  const zone = computeZone(runtime.snapshot.startedAt, now);
  for (const player of runtime.playersById.values()) {
    if (!player.alive) {
      continue;
    }
    const distance = Math.hypot(player.position.x - zone.center.x, player.position.y - zone.center.y);
    if (distance > zone.radius) {
      player.health = Math.max(0, player.health - 10 * deltaSeconds);
      if (player.health <= 0) {
        player.alive = false;
      }
    }
  }
}

function resolveWorldCollision(position: Vec2, map: MatchSnapshot["map"]): Vec2 {
  let resolved = { ...position };

  for (const obstacle of map.obstacles) {
    const dx = resolved.x - obstacle.x;
    const dy = resolved.y - obstacle.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = obstacle.radius + PLAYER_RADIUS;
    if (distance > 0 && distance < minDistance) {
      const push = (minDistance - distance) / distance;
      resolved = {
        x: clamp(resolved.x + dx * push, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS),
        y: clamp(resolved.y + dy * push, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS)
      };
    }
  }

  for (const building of map.buildings) {
    const left = building.x - PLAYER_RADIUS;
    const right = building.x + building.width + PLAYER_RADIUS;
    const top = building.y - PLAYER_RADIUS;
    const bottom = building.y + building.height + PLAYER_RADIUS;
    if (resolved.x >= left && resolved.x <= right && resolved.y >= top && resolved.y <= bottom) {
      const distances = [
        { edge: "left", value: Math.abs(resolved.x - left) },
        { edge: "right", value: Math.abs(right - resolved.x) },
        { edge: "top", value: Math.abs(resolved.y - top) },
        { edge: "bottom", value: Math.abs(bottom - resolved.y) }
      ].sort((a, b) => a.value - b.value);

      switch (distances[0].edge) {
        case "left":
          resolved.x = left;
          break;
        case "right":
          resolved.x = right;
          break;
        case "top":
          resolved.y = top;
          break;
        case "bottom":
          resolved.y = bottom;
          break;
      }
    }
  }

  return resolved;
}

function collidesWithBuilding(position: Vec2, map: MatchSnapshot["map"]): boolean {
  return map.buildings.some(
    (building) =>
      position.x >= building.x &&
      position.x <= building.x + building.width &&
      position.y >= building.y &&
      position.y <= building.y + building.height
  );
}

function isInWater(position: Vec2, waterTiles: Vec2[]): boolean {
  return waterTiles.some((tile) => Math.hypot(tile.x - position.x, tile.y - position.y) < 80);
}
