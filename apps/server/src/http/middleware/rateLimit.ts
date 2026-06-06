import type { NextFunction, Request, Response } from "express";

const bucket = new Map<string, { count: number; resetAt: number }>();

export function simpleRateLimit(limit = 50, windowMs = 60_000) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const current = bucket.get(key);

    if (!current || current.resetAt <= now) {
      bucket.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > limit) {
      response.status(429).json({ message: "Too many requests" });
      return;
    }

    next();
  };
}
