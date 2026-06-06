import type { WeaponDefinition } from "../types/network";

export const weapons: Record<WeaponDefinition["id"], WeaponDefinition> = {
  pistol: {
    id: "pistol",
    damage: 18,
    ammoCapacity: 12,
    fireRateMs: 280,
    projectileSpeed: 980,
    spread: 0.04
  },
  shotgun: {
    id: "shotgun",
    damage: 14,
    ammoCapacity: 6,
    fireRateMs: 850,
    projectileSpeed: 920,
    spread: 0.28,
    pellets: 6
  },
  assault_rifle: {
    id: "assault_rifle",
    damage: 21,
    ammoCapacity: 30,
    fireRateMs: 105,
    projectileSpeed: 1250,
    spread: 0.08
  },
  sniper: {
    id: "sniper",
    damage: 70,
    ammoCapacity: 5,
    fireRateMs: 1300,
    projectileSpeed: 1800,
    spread: 0.01
  }
};
