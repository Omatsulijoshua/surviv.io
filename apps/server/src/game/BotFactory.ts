import type { PlayerInput } from "@surviv/shared";

export function createBotInput(seed = Math.random()): PlayerInput {
  return {
    seq: Math.floor(seed * 100000),
    movement: {
      x: Math.cos(seed * Math.PI * 2),
      y: Math.sin(seed * Math.PI * 2)
    },
    aim: {
      x: Math.cos((seed + 0.25) * Math.PI * 2),
      y: Math.sin((seed + 0.25) * Math.PI * 2)
    },
    firing: seed > 0.4,
    reload: false,
    pickup: seed > 0.7
  };
}
