import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../services/auth";

export interface AuthenticatedRequest extends Request {
  auth?: ReturnType<typeof verifyToken>;
}

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    request.auth = verifyToken(header.slice("Bearer ".length));
    next();
  } catch {
    response.status(401).json({ message: "Invalid token" });
  }
}
