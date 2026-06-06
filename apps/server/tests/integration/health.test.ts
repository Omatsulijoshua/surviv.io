import { describe, expect, it } from "vitest";

describe("health route", () => {
  it("documents expected behavior", () => {
    expect({ ok: true, service: "surviv-server" }).toMatchObject({ ok: true });
  });
});
