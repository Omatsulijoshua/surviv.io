import { beforeAll, describe, expect, it } from "vitest";

let hashPassword: typeof import("../../src/services/auth").hashPassword;
let verifyPassword: typeof import("../../src/services/auth").verifyPassword;

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/test";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.JWT_SECRET = "test-secret-value";
  ({ hashPassword, verifyPassword } = await import("../../src/services/auth"));
});

describe("auth hashing", () => {
  it("hashes and verifies a password", () => {
    const password = "secret-password";
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });
});
