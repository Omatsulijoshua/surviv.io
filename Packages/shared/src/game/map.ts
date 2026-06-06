import { WORLD_HEIGHT, WORLD_WIDTH } from "../constants/game";
import type { Building, LootItem, MapSeed, Obstacle, WeaponDefinition } from "../types/network";
import { mulberry32, randomRange } from "../utils/random";

const weaponTable: WeaponDefinition["id"][] = ["pistol", "shotgun", "assault_rifle", "sniper"];
const healingTable = ["bandage", "medkit", "boost"];

export function generateMap(seed = Date.now()): MapSeed {
  const random = mulberry32(seed);
  const buildings: Building[] = [];
  const loot: LootItem[] = [];
  const waterTiles = [];
  const obstacles: Obstacle[] = [];

  for (let i = 0; i < 12; i += 1) {
    buildings.push({
      id: `b-${i}`,
      x: randomRange(random, 180, WORLD_WIDTH - 360),
      y: randomRange(random, 180, WORLD_HEIGHT - 360),
      width: randomRange(random, 130, 260),
      height: randomRange(random, 130, 240)
    });
  }

  for (let i = 0; i < 24; i += 1) {
    waterTiles.push({
      x: randomRange(random, 0, WORLD_WIDTH),
      y: randomRange(random, 0, WORLD_HEIGHT)
    });
  }

  for (let i = 0; i < 50; i += 1) {
    loot.push({
      id: `l-${i}`,
      kind: i % 3 === 0 ? "weapon" : i % 3 === 1 ? "healing" : "ammo",
      subtype: i % 3 === 0 ? weaponTable[i % weaponTable.length] : healingTable[i % healingTable.length],
      amount: i % 3 === 2 ? 30 : 1,
      position: {
        x: randomRange(random, 70, WORLD_WIDTH - 70),
        y: randomRange(random, 70, WORLD_HEIGHT - 70)
      }
    });
  }

  for (let i = 0; i < 34; i += 1) {
    obstacles.push({
      id: `o-${i}`,
      x: randomRange(random, 50, WORLD_WIDTH - 50),
      y: randomRange(random, 50, WORLD_HEIGHT - 50),
      radius: randomRange(random, 18, 42),
      destructible: i % 2 === 0,
      health: i % 2 === 0 ? 80 : 9999
    });
  }

  return { seed, buildings, loot, waterTiles, obstacles };
}
