import { describe, expect, it } from "vitest";
import {
  budgetScore,
  computeCompatibility,
  DEFAULT_WEIGHTS,
  lifestyleScore,
  locationScore,
  moveInScore,
  type MatchableProfile,
} from "@/lib/services/matching.service";

const base: MatchableProfile = {
  id: "profile-a",
  universityId: "uni-1",
  campusId: "campus-1",
  preferredLocations: ["Ogige", "Awkunanaw"],
  budgetMin: 40_000,
  budgetMax: 80_000,
  moveInDate: new Date("2026-10-01T00:00:00.000Z"),
  smoking: false,
  pets: false,
  cleanliness: "BALANCED",
  sleepSchedule: "EARLY_BIRD",
  studyHabits: "STUDIES_AT_HOME",
  socialPreference: "OCCASIONALLY_SOCIAL",
  noiseTolerance: "MEDIUM",
};

const profile = (overrides: Partial<MatchableProfile> = {}): MatchableProfile => ({
  ...base,
  id: "profile-b",
  ...overrides,
});

describe("budgetScore", () => {
  it("returns 1 when one range fully contains the other", () => {
    expect(budgetScore(base, profile({ budgetMin: 50_000, budgetMax: 70_000 }))).toBe(1);
  });

  it("scores partial overlap proportionally", () => {
    const score = budgetScore(base, profile({ budgetMin: 60_000, budgetMax: 100_000 }));
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("returns 0 for ranges that do not touch", () => {
    expect(budgetScore(base, profile({ budgetMin: 200_000, budgetMax: 300_000 }))).toBe(0);
  });
});

describe("locationScore", () => {
  it("prefers the same campus over the same university", () => {
    const sameCampus = locationScore(base, profile());
    const sameUniversity = locationScore(base, profile({ campusId: "campus-2" }));
    expect(sameCampus).toBe(1);
    expect(sameUniversity).toBeLessThan(sameCampus);
  });

  it("still gives partial credit for shared areas at a different university", () => {
    const shared = locationScore(base, profile({ universityId: "uni-2", campusId: null }));
    const unshared = locationScore(
      base,
      profile({ universityId: "uni-2", campusId: null, preferredLocations: ["Ikoyi"] }),
    );
    expect(shared).toBeGreaterThan(unshared);
    expect(unshared).toBeLessThan(0.2);
  });

  it("matches area names case-insensitively", () => {
    expect(
      locationScore(base, profile({ universityId: "uni-2", campusId: null, preferredLocations: ["ogige"] })),
    ).toBeGreaterThan(0.4);
  });
});

describe("moveInScore", () => {
  it("treats dates within a week as identical", () => {
    expect(moveInScore(base, profile({ moveInDate: new Date("2026-10-05T00:00:00.000Z") }))).toBe(1);
  });

  it("decays as the gap widens and bottoms out at 0", () => {
    const month = moveInScore(base, profile({ moveInDate: new Date("2026-11-01T00:00:00.000Z") }));
    const year = moveInScore(base, profile({ moveInDate: new Date("2027-10-01T00:00:00.000Z") }));
    expect(month).toBeGreaterThan(0.5);
    expect(year).toBe(0);
  });
});

describe("lifestyleScore", () => {
  it("returns a perfect score and no mismatches for identical habits", () => {
    const result = lifestyleScore(base, profile());
    expect(result.score).toBeCloseTo(1, 5);
    expect(result.mismatches).toEqual([]);
  });

  it("names a smoking mismatch explicitly rather than silently deducting", () => {
    const result = lifestyleScore(base, profile({ smoking: true }));
    expect(result.mismatches).toContain("Different smoking preferences");
    expect(result.score).toBeLessThan(1);
  });

  it("gives partial credit for adjacent cleanliness habits", () => {
    const tidy = profile({ cleanliness: "VERY_TIDY" });
    const adjacent = lifestyleScore(tidy, profile({ cleanliness: "BALANCED" }));
    const opposite = lifestyleScore(tidy, profile({ cleanliness: "RELAXED" }));
    expect(adjacent.score).toBeGreaterThan(opposite.score);
    expect(opposite.mismatches).toContain("Very different cleanliness habits");
    expect(adjacent.mismatches).not.toContain("Very different cleanliness habits");
  });

  it("treats a flexible sleep schedule as mostly compatible with either extreme", () => {
    const flexible = lifestyleScore(base, profile({ sleepSchedule: "FLEXIBLE" }));
    const opposite = lifestyleScore(base, profile({ sleepSchedule: "NIGHT_OWL" }));
    expect(flexible.score).toBeGreaterThan(opposite.score);
    expect(opposite.mismatches).toContain("Opposite sleep schedules");
  });
});

describe("computeCompatibility", () => {
  it("scores an identical pair at 100", () => {
    expect(computeCompatibility(base, profile()).score).toBe(100);
  });

  it("keeps the score within 0–100 for badly mismatched profiles", () => {
    const result = computeCompatibility(
      base,
      profile({
        universityId: "uni-9",
        campusId: null,
        preferredLocations: ["Ikoyi"],
        budgetMin: 500_000,
        budgetMax: 900_000,
        moveInDate: new Date("2030-01-01T00:00:00.000Z"),
        smoking: true,
        pets: true,
        cleanliness: "RELAXED",
        sleepSchedule: "NIGHT_OWL",
        studyHabits: "STUDIES_OUTSIDE",
        socialPreference: "VERY_SOCIAL",
        noiseTolerance: "HIGH",
      }),
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeLessThan(20);
    expect(result.mismatches.length).toBeGreaterThan(0);
  });

  it("never lets a protected characteristic change the score", () => {
    // Gender is not part of MatchableProfile at all; this asserts the score is
    // unchanged when every scored field is identical and only the id differs.
    const one = computeCompatibility(base, profile({ id: "b-1" }));
    const two = computeCompatibility(base, profile({ id: "b-2" }));
    expect(one.score).toBe(two.score);
    expect(one.reasons).toEqual(two.reasons);
  });

  it("respects user-supplied weights", () => {
    const budgetHeavy = { budgetWeight: 100, locationWeight: 0, moveInWeight: 0, lifestyleWeight: 0 };
    const lifestyleHeavy = { budgetWeight: 0, locationWeight: 0, moveInWeight: 0, lifestyleWeight: 100 };
    const mismatchedBudget = profile({ budgetMin: 500_000, budgetMax: 900_000 });

    expect(computeCompatibility(base, mismatchedBudget, budgetHeavy).score).toBe(0);
    expect(computeCompatibility(base, mismatchedBudget, lifestyleHeavy).score).toBe(100);
  });

  it("defaults weights that sum to 100 so percentages are honest", () => {
    const total =
      DEFAULT_WEIGHTS.budgetWeight +
      DEFAULT_WEIGHTS.locationWeight +
      DEFAULT_WEIGHTS.moveInWeight +
      DEFAULT_WEIGHTS.lifestyleWeight;
    expect(total).toBe(100);
  });

  it("explains the score with human-readable reasons", () => {
    const result = computeCompatibility(base, profile());
    expect(result.reasons).toContain("Same campus");
    expect(result.reasons).toContain("Similar budget");
  });
});
