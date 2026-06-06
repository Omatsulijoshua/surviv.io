import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import type { MatchSnapshot, QueueMode } from "@surviv/shared";
import { createGame } from "./game/PhaserGame";
import { login, register } from "./lib/api";
import { Hud } from "./components/Hud";

type Session = {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
};

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const phaserHostRef = useRef<HTMLDivElement | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [queueMode, setQueueMode] = useState<QueueMode>("solo");
  const [isGameReady, setIsGameReady] = useState(false);
  const [snapshot, setSnapshot] = useState<MatchSnapshot | undefined>(undefined);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasJoinedMatch, setHasJoinedMatch] = useState(false);
  const [form, setForm] = useState({ email: "player@example.com", password: "hunter2secure", displayName: "PlayerOne" });

  useEffect(() => {
    const saved = localStorage.getItem("surviv-session");
    if (saved) {
      setSession(JSON.parse(saved) as Session);
    }
  }, []);

  useEffect(() => {
    if (session) {
      localStorage.setItem("surviv-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("surviv-session");
    }
  }, [session]);

  useEffect(() => {
    if (!phaserHostRef.current || gameRef.current) {
      return;
    }
    gameRef.current = createGame("phaser-root", setIsGameReady, setSnapshot);
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  const joinMatch = () => {
    if (!session || !gameRef.current) {
      return;
    }
    const scene = gameRef.current.scene.getScene("battle") as unknown as {
      attach: (token: string, mode: QueueMode, localPlayerId: string) => void;
    };
    scene.attach(session.token, queueMode, session.user.id);
    setHasJoinedMatch(true);
  };

  const canJoinMatch = Boolean(session) && isGameReady && (!hasJoinedMatch || Boolean(snapshot?.winnerId));
  const joinLabel = hasJoinedMatch && !snapshot?.winnerId ? "Match In Progress" : snapshot?.winnerId ? "Queue Again" : "Enter Match";

  const handleRegister = async () => {
    try {
      setAuthError(null);
      setSession(await register(form));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to register");
    }
  };

  const handleLogin = async () => {
    try {
      setAuthError(null);
      setSession(await login(form));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to login");
    }
  };

  return (
    <main className="app-shell">
      <section className="marketing">
        <p className="badge">Production-ready browser battle royale</p>
        <h1>Last squad standing, rendered in Phaser and synchronized by an authoritative Node server.</h1>
        <p className="lede">
          Queue into solo, duo, or squad matches, scavenge weapons and healing, stay ahead of the closing zone, and survive the final circle.
        </p>
        <div className="auth-panel">
          <input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Display name" />
          <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
          <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" />
          <div className="button-row">
            <button onClick={handleRegister}>Register</button>
            <button className="ghost" onClick={handleLogin}>Login</button>
          </div>
          {authError ? <p className="error-text">{authError}</p> : null}
          {session ? <p className="muted">Signed in as {session.user.displayName}</p> : null}
        </div>
        <div className="queue-panel">
          <select value={queueMode} onChange={(event) => setQueueMode(event.target.value as QueueMode)}>
            <option value="solo">Solo</option>
            <option value="duo">Duo</option>
            <option value="squad">Squad</option>
          </select>
          <button disabled={!canJoinMatch} onClick={joinMatch}>
            {joinLabel}
          </button>
          <button className="ghost" disabled={!session} onClick={() => { setSession(null); setHasJoinedMatch(false); setSnapshot(undefined); }}>
            Sign Out
          </button>
        </div>
      </section>

      <section className="playfield">
        <div id="phaser-root" ref={phaserHostRef} className="phaser-root" />
        <Hud snapshot={snapshot} queueMode={queueMode} localPlayerId={session?.user.id} hasJoinedMatch={hasJoinedMatch} />
      </section>
    </main>
  );
}
