import type { MatchSnapshot } from "@surviv/shared";

interface HudProps {
  snapshot?: MatchSnapshot;
  queueMode: "solo" | "duo" | "squad";
  localPlayerId?: string;
  hasJoinedMatch: boolean;
}

export function Hud({ snapshot, queueMode, localPlayerId, hasJoinedMatch }: HudProps) {
  const localPlayer = snapshot?.players.find((player) => player.id === localPlayerId) ?? snapshot?.players[0];
  const aliveCount = snapshot?.players.filter((player) => player.alive).length ?? 0;
  const leaderboard = [...(snapshot?.players ?? [])]
    .sort((left, right) => right.kills - left.kills || Number(right.alive) - Number(left.alive))
    .slice(0, 5);
  const zoneSeconds = snapshot ? Math.max(0, Math.ceil((snapshot.zone.nextShrinkAt - Date.now()) / 1000)) : 0;
  const statusText = !hasJoinedMatch
    ? "Ready in lobby."
    : snapshot?.winnerId
    ? snapshot.winnerId === localPlayerId
      ? "Winner winner."
      : "Match complete."
    : localPlayer && !localPlayer.alive
      ? "Eliminated. Spectating."
      : "In match.";

  return (
    <aside className="hud">
      <div className="hud-card">
        <span className="eyebrow">Status</span>
        <strong>{statusText}</strong>
      </div>
      <div className="hud-card">
        <span className="eyebrow">Mode</span>
        <strong>{queueMode.toUpperCase()}</strong>
      </div>
      <div className="hud-card">
        <span className="eyebrow">Alive</span>
        <strong>{aliveCount}</strong>
      </div>
      <div className="hud-card">
        <span className="eyebrow">Health</span>
        <strong>{Math.round(localPlayer?.health ?? 0)}</strong>
      </div>
      <div className="hud-card">
        <span className="eyebrow">Armor</span>
        <strong>{Math.round(localPlayer?.armor ?? 0)}</strong>
      </div>
      <div className="hud-card">
        <span className="eyebrow">Weapon</span>
        <strong>{localPlayer?.weaponId ?? "pistol"}</strong>
        <div className="ammo-grid">
          {localPlayer
            ? Object.entries(localPlayer.ammo).map(([weapon, ammo]) => (
                <div key={weapon} className={weapon === localPlayer.weaponId ? "ammo-row ammo-row-active" : "ammo-row"}>
                  <span>{weapon.replaceAll("_", " ")}</span>
                  <strong>{ammo}</strong>
                </div>
              ))
            : null}
        </div>
      </div>
      <div className="hud-card">
        <span className="eyebrow">Zone</span>
        <strong>Phase {snapshot ? snapshot.zone.phase + 1 : 1}</strong>
        <div className="muted">Shrinks in {zoneSeconds}s</div>
      </div>
      <div className="hud-card minimap-card">
        <span className="eyebrow">Minimap</span>
        <div className="minimap">
          {snapshot?.map.buildings.map((building) => (
            <span
              key={building.id}
              className="minimap-building"
              style={{
                left: `${(building.x / 2800) * 100}%`,
                top: `${(building.y / 2800) * 100}%`,
                width: `${(building.width / 2800) * 100}%`,
                height: `${(building.height / 2800) * 100}%`
              }}
            />
          ))}
          {snapshot?.players.map((player) => (
            <span
              key={player.id}
              className={player.id === localPlayerId ? "minimap-dot minimap-dot-local" : "minimap-dot"}
              style={{
                left: `${(player.position.x / 2800) * 100}%`,
                top: `${(player.position.y / 2800) * 100}%`,
                opacity: player.alive ? 1 : 0.28
              }}
            />
          ))}
          {snapshot ? (
            <span
              className="minimap-zone"
              style={{
                left: `${((snapshot.zone.center.x - snapshot.zone.radius) / 2800) * 100}%`,
                top: `${((snapshot.zone.center.y - snapshot.zone.radius) / 2800) * 100}%`,
                width: `${((snapshot.zone.radius * 2) / 2800) * 100}%`,
                height: `${((snapshot.zone.radius * 2) / 2800) * 100}%`
              }}
            />
          ) : null}
        </div>
      </div>
      <div className="kill-feed">
        <span className="eyebrow">Leaderboard</span>
        {leaderboard.map((player, index) => (
          <div key={player.id} className="kill-line">
            #{index + 1} {player.name} · {player.kills} K
          </div>
        ))}
      </div>
      <div className="kill-feed">
        <span className="eyebrow">Kill Feed</span>
        {snapshot?.killFeed.length ? (
          snapshot.killFeed.map((event) => (
            <div key={event.id} className="kill-line">
              {event.killer} eliminated {event.victim}
            </div>
          ))
        ) : (
          <div className="kill-line muted">No eliminations yet</div>
        )}
      </div>
      <div className="hud-card">
        <span className="eyebrow">Controls</span>
        <div className="kill-line">WASD move</div>
        <div className="kill-line">Mouse aim + fire</div>
        <div className="kill-line">E pickup</div>
        <div className="kill-line">R reload</div>
      </div>
    </aside>
  );
}
