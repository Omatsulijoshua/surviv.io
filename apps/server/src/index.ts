import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "node:http";
import { Pool } from "pg";
import Redis from "ioredis";
import { Server } from "socket.io";
import { env } from "./config/env";
import { healthRouter } from "./http/routes/health";
import { createAuthRouter } from "./http/routes/auth";
import { simpleRateLimit } from "./http/middleware/rateLimit";
import { UserRepository } from "./repositories/userRepository";
import { Matchmaker } from "./game/Matchmaker";
import { registerGameSockets } from "./sockets/registerGameSockets";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    credentials: true
  }
});

const postgres = new Pool({ connectionString: env.DATABASE_URL });
const redis = new Redis(env.REDIS_URL);
const users = new UserRepository(postgres);
const matchmaker = new Matchmaker();

void redis.ping();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(simpleRateLimit());

app.use("/api/health", healthRouter);
app.use("/api/auth", createAuthRouter(users));

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  response.status(400).json({ message });
});

registerGameSockets(io, matchmaker);

setInterval(() => {
  const now = Date.now();
  for (const room of matchmaker.getRooms()) {
    const snapshot = room.tick(now);
    io.to(room.id).emit("match:snapshot", snapshot);
  }
}, 1000 / env.TICK_RATE);

httpServer.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
