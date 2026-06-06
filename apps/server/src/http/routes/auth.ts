import { Router } from "express";
import { z } from "zod";
import { hashPassword, signToken, verifyPassword } from "../../services/auth";
import { UserRepository } from "../../repositories/userRepository";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(3).max(24)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export function createAuthRouter(users: UserRepository): Router {
  const router = Router();

  router.post("/register", async (request, response, next) => {
    try {
      const body = registerSchema.parse(request.body);
      const existing = await users.findByEmail(body.email);
      if (existing) {
        response.status(409).json({ message: "Email already registered" });
        return;
      }

      const created = await users.create(body.email, hashPassword(body.password), body.displayName);
      const token = signToken({ sub: created.id, email: created.email, displayName: created.display_name });
      response.status(201).json({ token, user: { id: created.id, email: created.email, displayName: created.display_name } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (request, response, next) => {
    try {
      const body = loginSchema.parse(request.body);
      const user = await users.findByEmail(body.email);
      if (!user || !verifyPassword(body.password, user.password_hash)) {
        response.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const token = signToken({ sub: user.id, email: user.email, displayName: user.display_name });
      response.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
