/**
 * Roommate compatibility scoring.
 *
 * Transparent, weighted scoring over user-selected housing and lifestyle
 * preferences only. Protected characteristics are NEVER scored: gender is
 * not part of compatibility. Users may apply their own gender preference as
 * an explicit, visible filter when browsing — the platform never hides or
 * reorders matches based on protected traits.
 *
 * Score = budgetWeight·budget + locationWeight·location
 *       + moveInWeight·moveIn + lifestyleWeight·lifestyle  (weights sum 100)
 */

export interface MatchableProfile {
  id: string;
  universityId: string;
  campusId: string | null;
  preferredLocations: string[];
  budgetMin: number;
  budgetMax: number;
  moveInDate: Date;
  smoking: boolean;
  pets: boolean;
  cleanliness: string;
  sleepSchedule: string;
  studyHabits: string;
  socialPreference: string;
  noiseTolerance: string;
}

export interface MatchingWeights {
  budgetWeight: number;
  locationWeight: number;
  moveInWeight: number;
  lifestyleWeight: number;
}

export const DEFAULT_WEIGHTS: MatchingWeights = {
  budgetWeight: 25,
  locationWeight: 20,
  moveInWeight: 20,
  lifestyleWeight: 35,
};

export interface CompatibilityResult {
  /** 0–100 */
  score: number;
  reasons: string[];
  mismatches: string[];
}

/** 0–1 based on overlap of the two budget ranges. */
export function budgetScore(a: MatchableProfile, b: MatchableProfile): number {
  const overlapStart = Math.max(a.budgetMin, b.budgetMin);
  const overlapEnd = Math.min(a.budgetMax, b.budgetMax);
  if (overlapEnd < overlapStart) {
    // No overlap: score by how close the ranges are relative to their size.
    const gap = overlapStart - overlapEnd;
    const scale = Math.max(a.budgetMax - a.budgetMin, b.budgetMax - b.budgetMin, 1);
    return Math.max(0, 1 - gap / scale);
  }
  const overlap = overlapEnd - overlapStart;
  const minSpan = Math.min(a.budgetMax - a.budgetMin, b.budgetMax - b.budgetMin) || 1;
  return Math.min(1, overlap / minSpan);
}

/** 0–1: same campus > same university > shared preferred areas. */
export function locationScore(a: MatchableProfile, b: MatchableProfile): number {
  if (a.campusId && b.campusId && a.campusId === b.campusId) return 1;
  if (a.universityId === b.universityId) {
    const sharedAreas = a.preferredLocations.filter((loc) =>
      b.preferredLocations.some((other) => other.toLowerCase() === loc.toLowerCase()),
    );
    return sharedAreas.length > 0 ? 0.95 : 0.7;
  }
  const sharedAreas = a.preferredLocations.filter((loc) =>
    b.preferredLocations.some((other) => other.toLowerCase() === loc.toLowerCase()),
  );
  return sharedAreas.length > 0 ? 0.5 : 0.1;
}

/** 0–1: identical dates = 1, decaying over ~4 months. */
export function moveInScore(a: MatchableProfile, b: MatchableProfile): number {
  const daysApart =
    Math.abs(a.moveInDate.getTime() - b.moveInDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysApart <= 7) return 1;
  return Math.max(0, 1 - daysApart / 120);
}

const CLOSE_NOISE: Record<string, string[]> = {
  LOW: ["LOW", "MEDIUM"],
  MEDIUM: ["LOW", "MEDIUM", "HIGH"],
  HIGH: ["MEDIUM", "HIGH"],
};

/** 0–1 across lifestyle dimensions; smoking/pets mismatches weigh heavily. */
export function lifestyleScore(a: MatchableProfile, b: MatchableProfile): {
  score: number;
  mismatches: string[];
} {
  const mismatches: string[] = [];
  let score = 0;
  const parts = 6;

  // Smoking (2x severity inside its slot)
  if (a.smoking === b.smoking) score += 1;
  else {
    mismatches.push("Different smoking preferences");
    score += 0;
  }

  // Pets
  if (a.pets === b.pets) score += 1;
  else mismatches.push("Different pet preferences");

  // Cleanliness: adjacent levels count as half-matches
  if (a.cleanliness === b.cleanliness) score += 1;
  else {
    const levels = ["VERY_TIDY", "BALANCED", "RELAXED"];
    const diff = Math.abs(levels.indexOf(a.cleanliness) - levels.indexOf(b.cleanliness));
    score += diff === 1 ? 0.5 : 0;
    if (diff > 1) mismatches.push("Very different cleanliness habits");
  }

  // Sleep schedule
  if (a.sleepSchedule === b.sleepSchedule) score += 1;
  else if (a.sleepSchedule === "FLEXIBLE" || b.sleepSchedule === "FLEXIBLE") score += 0.7;
  else mismatches.push("Opposite sleep schedules");

  // Study habits
  if (a.studyHabits === b.studyHabits) score += 1;
  else if (a.studyHabits === "MIXED" || b.studyHabits === "MIXED") score += 0.6;

  // Noise tolerance + social preference combined
  const noiseOk =
    a.noiseTolerance === b.noiseTolerance ||
    (CLOSE_NOISE[a.noiseTolerance] ?? []).includes(b.noiseTolerance);
  const socialOk = a.socialPreference === b.socialPreference;
  score += (noiseOk ? 0.5 : 0) + (socialOk ? 0.5 : 0);
  if (!noiseOk) mismatches.push("Different noise tolerance");

  return { score: score / parts, mismatches };
}

export function computeCompatibility(
  a: MatchableProfile,
  b: MatchableProfile,
  weights: MatchingWeights = DEFAULT_WEIGHTS,
): CompatibilityResult {
  const reasons: string[] = [];
  const mismatches: string[] = [];

  const budget = budgetScore(a, b);
  if (budget >= 0.6) reasons.push("Similar budget");

  const location = locationScore(a, b);
  if (a.campusId && a.campusId === b.campusId) reasons.push("Same campus");
  else if (a.universityId === b.universityId) reasons.push("Same university");
  if (location >= 0.9 && a.universityId !== b.universityId) reasons.push("Same preferred areas");

  const moveIn = moveInScore(a, b);
  if (moveIn >= 0.75) reasons.push("Similar move-in date");

  const lifestyle = lifestyleScore(a, b);
  if (lifestyle.score >= 0.7) reasons.push("Compatible lifestyle habits");
  mismatches.push(...lifestyle.mismatches);

  const totalWeight =
    weights.budgetWeight + weights.locationWeight + weights.moveInWeight + weights.lifestyleWeight || 1;

  const score = Math.round(
    ((budget * weights.budgetWeight +
      location * weights.locationWeight +
      moveIn * weights.moveInWeight +
      lifestyle.score * weights.lifestyleWeight) /
      totalWeight) *
      100,
  );

  return { score: Math.max(0, Math.min(100, score)), reasons, mismatches };
}
