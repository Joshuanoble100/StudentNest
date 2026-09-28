import { z } from "zod";
import { uuidSchema } from "./common";

export const roommateProfileSchema = z.object({
  universityId: uuidSchema,
  campusId: uuidSchema.nullable().optional(),
  preferredLocations: z.array(z.string().trim().min(2).max(80)).max(10).default([]),
  budgetMin: z.coerce.number().int().min(0).max(50_000_000),
  budgetMax: z.coerce.number().int().min(0).max(50_000_000),
  preferredRoomType: z
    .enum([
      "SELF_CONTAIN","SINGLE_ROOM","FLAT","APARTMENT","DUPLEX","BUNGALOW",
      "HOSTEL_ROOM","SHARED_ROOM","STUDIO","OTHER",
    ])
    .nullable()
    .optional(),
  desiredRoommates: z.coerce.number().int().min(1).max(10).default(1),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).nullable().optional(),
  genderPreference: z.enum(["MALE", "FEMALE", "ANY"]).nullable().optional(),
  smoking: z.boolean().default(false),
  pets: z.boolean().default(false),
  cleanliness: z.enum(["VERY_TIDY", "BALANCED", "RELAXED"]).default("BALANCED"),
  sleepSchedule: z.enum(["EARLY_BIRD", "NIGHT_OWL", "FLEXIBLE"]).default("FLEXIBLE"),
  studyHabits: z.enum(["STUDIES_AT_HOME", "STUDIES_OUTSIDE", "MIXED"]).default("MIXED"),
  socialPreference: z
    .enum(["VERY_SOCIAL", "OCCASIONALLY_SOCIAL", "QUIET_PRIVATE"])
    .default("OCCASIONALLY_SOCIAL"),
  noiseTolerance: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  moveInDate: z.coerce.date(),
  bio: z.string().trim().max(1000).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "HIDDEN"]).default("ACTIVE"),
}).refine((data) => data.budgetMax >= data.budgetMin, {
  message: "Maximum budget must be at least the minimum budget",
  path: ["budgetMax"],
});
export type RoommateProfileInput = z.infer<typeof roommateProfileSchema>;

export const roommatePreferenceSchema = z.object({
  budgetWeight: z.coerce.number().int().min(0).max(100).default(25),
  locationWeight: z.coerce.number().int().min(0).max(100).default(20),
  moveInWeight: z.coerce.number().int().min(0).max(100).default(20),
  lifestyleWeight: z.coerce.number().int().min(0).max(100).default(35),
}).refine(
  (d) => d.budgetWeight + d.locationWeight + d.moveInWeight + d.lifestyleWeight === 100,
  "Weights must add up to 100",
);
export type RoommatePreferenceInput = z.infer<typeof roommatePreferenceSchema>;

export const roommateListSchema = z.object({
  universityId: uuidSchema.optional(),
  budgetMin: z.coerce.number().int().min(0).optional(),
  budgetMax: z.coerce.number().int().min(0).optional(),
  smoking: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).max(200).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
