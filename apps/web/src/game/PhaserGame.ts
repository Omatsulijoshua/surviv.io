import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene";
import type { MatchSnapshot } from "@surviv/shared";

export function createGame(
  parent: string,
  onReadyStateChange: (ready: boolean) => void,
  onSnapshot: (snapshot: MatchSnapshot) => void
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 640,
    backgroundColor: "#16311c",
    scene: [new BattleScene(onReadyStateChange, onSnapshot)],
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    }
  });
}
