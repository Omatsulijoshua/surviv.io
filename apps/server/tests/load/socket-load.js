import { io } from "socket.io-client";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const TOKEN = process.env.TEST_TOKEN ?? "";
const CLIENTS = Number(process.env.CLIENTS ?? 25);

if (!TOKEN) {
  console.error("Set TEST_TOKEN before running the load probe.");
  process.exit(1);
}

for (let i = 0; i < CLIENTS; i += 1) {
  const socket = io(API_URL, { auth: { token: TOKEN } });
  socket.on("connect", () => {
    socket.emit("queue:join", "solo");
    setInterval(() => {
      socket.emit("player:input", {
        seq: Date.now(),
        movement: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        aim: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        firing: Math.random() > 0.5,
        reload: false,
        pickup: Math.random() > 0.8
      });
    }, 100);
  });
}
