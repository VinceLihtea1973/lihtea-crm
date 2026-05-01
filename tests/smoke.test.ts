import { describe, it, expect } from "vitest";

/**
 * Smoke test — garantit au moins que la CI exécute quelque chose.
 * À étoffer avec les vrais tests unitaires dès Phase 2.
 */
describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
