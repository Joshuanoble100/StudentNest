import { z } from "zod";
import { uuidSchema } from "./common";

export const propertyModerationSchema = z.object({
  propertyId: uuidSchema,
  action: z.enum(["APPROVE", "REJECT", "SUSPEND", "RESTORE", "FEATURE", "UNFEATURE", "DELETE"]),
  reason: z.string().trim().max(1000).optional(),
});

export const propertyVerificationSchema = z.object({
  propertyId: uuidSchema,
  decision: z.enum(["VERIFIED", "REJECTED"]),
  evidenceNote: z.string().trim().max(1000).optional(),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export const userModerationSchema = z.object({
  userId: uuidSchema,
  action: z.enum(["SUSPEND", "REACTIVATE", "PROMOTE_ADMIN", "DEMOTE_ADMIN", "DELETE"]),
  reason: z.string().trim().max(1000).optional(),
});

export const accountVerificationSchema = z.object({
  requestId: uuidSchema,
  decision: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export const verificationRequestSchema = z.object({
  type: z.enum(["IDENTITY", "OWNERSHIP", "AGENCY_LICENSE"]),
  submittedData: z.record(z.string(), z.unknown()).optional(),
  documentUrls: z.array(z.string().max(2048)).max(5).default([]),
});

export const reportHandlingSchema = z.object({
  reportId: uuidSchema,
  action: z.enum(["REVIEW", "RESOLVE", "DISMISS"]),
  resolution: z.string().trim().max(1000).optional(),
});

export const universitySchema = z.object({
  name: z.string().trim().min(3).max(150),
  shortName: z.string().trim().min(2).max(20).toUpperCase(),
  slug: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  country: z.string().trim().default("Nigeria"),
});

export const campusSchema = z.object({
  universityId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().max(80).optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
});

export const neighborhoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
});
