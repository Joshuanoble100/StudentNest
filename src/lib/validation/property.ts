import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common";

const amenityKeys = [
  "WATER","ELECTRICITY","GENERATOR","SOLAR","INTERNET","WIFI","PARKING","KITCHEN",
  "LAUNDRY","SECURITY","FENCED_COMPOUND","CCTV","PREPAID_METER","SHARED_FACILITIES",
  "FURNITURE","AIR_CONDITIONING","WARDROBE","EN_SUITE","BALCONY","TILED_FLOOR",
] as const;

const propertyTypes = [
  "SELF_CONTAIN","SINGLE_ROOM","FLAT","APARTMENT","DUPLEX","BUNGALOW",
  "HOSTEL_ROOM","SHARED_ROOM","STUDIO","OTHER",
] as const;

const nullableInt1to5 = z.coerce.number().int().min(1).max(5).nullable().optional();

export const propertyConditionSchema = z.object({
  electricityAvailable: z.boolean().default(true),
  generatorAvailable: z.boolean().default(false),
  solarAvailable: z.boolean().default(false),
  prepaidMeter: z.boolean().default(false),
  waterSource: z
    .enum(["BOREHOLE", "PUBLIC_WATER", "TANK", "WELL", "OTHER", "NONE"])
    .default("NONE"),
  internetType: z.enum(["FIBRE", "MOBILE_NETWORK", "WIFI", "NONE"]).default("NONE"),
  securityFeatures: z
    .array(z.enum(["FENCED_COMPOUND", "SECURITY_PERSONNEL", "CCTV", "GATE"]))
    .default([]),
  electricityReliability: nullableInt1to5,
  waterReliability: nullableInt1to5,
  networkQuality: nullableInt1to5,
  roadCondition: nullableInt1to5,
  noiseLevel: nullableInt1to5,
  cleanliness: nullableInt1to5,
  floodRisk: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]).default("UNKNOWN"),
});
export type PropertyConditionInput = z.infer<typeof propertyConditionSchema>;

export const propertyImageMetaSchema = z.object({
  id: uuidSchema.optional(),
  url: z.string().min(1).max(2048),
  alt: z.string().trim().max(200).optional().nullable(),
  width: z.coerce.number().int().positive().optional().nullable(),
  height: z.coerce.number().int().positive().optional().nullable(),
  thumbUrl: z.string().max(2048).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
  isCover: z.boolean().default(false),
});

export const propertyCreateSchema = z
  .object({
    title: z.string().trim().min(3, "Title is too short").max(120),
    description: z.string().trim().min(20, "Add at least 20 characters").max(5000),
    providerType: z.enum(["LANDLORD", "CARETAKER", "AGENT"]).default("LANDLORD"),
    propertyType: z.enum(propertyTypes),
    rentAmount: z.coerce
      .number()
      .int("Rent must be a whole Naira amount")
      .min(1000, "Rent seems too low")
      .max(500_000_000, "Rent seems too high"),
    rentPeriod: z.enum(["PER_MONTH", "PER_SEMESTER", "PER_SESSION", "PER_YEAR"]).default("PER_YEAR"),
    cautionDeposit: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
    agencyFee: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
    serviceCharge: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
    bedrooms: z.coerce.number().int().min(0).max(50).default(1),
    bathrooms: z.coerce.number().int().min(0).max(50).default(1),
    maxOccupants: z.coerce.number().int().min(1).max(50).default(1),
    furnishing: z.enum(["FURNISHED", "PARTIALLY_FURNISHED", "UNFURNISHED"]).default("UNFURNISHED"),
    availableNow: z.boolean().default(true),
    availableFrom: z.coerce.date().nullable().optional(),
    universityId: uuidSchema,
    campusId: uuidSchema.nullable().optional(),
    neighborhoodId: uuidSchema.nullable().optional(),
    addressLine: z.string().trim().max(250).nullable().optional(),
    areaName: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
    longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
    locationApproximate: z.boolean().default(false),
    amenities: z.array(z.enum(amenityKeys)).max(amenityKeys.length).default([]),
    features: z.array(z.string().trim().min(2).max(80)).max(30).default([]),
    condition: propertyConditionSchema.optional(),
    images: z.array(propertyImageMetaSchema).min(1, "Add at least one photo").max(20),
    houseRules: z.string().trim().max(2000).optional(),
    submitForReview: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (!data.availableNow && !data.availableFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["availableFrom"],
        message: "Set an availability date or mark as available now",
      });
    }
    if (data.images.length > 0 && !data.images.some((img) => img.isCover)) {
      ctx.addIssue({
        code: "custom",
        path: ["images"],
        message: "Select one photo as the cover image",
      });
    }
  });
export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;

export const propertyUpdateSchema = propertyCreateSchema
  .omit({ images: true, submitForReview: true })
  .partial()
  .extend({
    images: z.array(propertyImageMetaSchema).max(20).optional(),
    status: z.enum(["DRAFT", "PENDING_REVIEW", "RENTED_OUT"]).optional(),
  });
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;

// -- Search ----------------------------------------------------------------

const booleanish = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1")
  .optional();

export const propertySearchSchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  university: z.string().trim().max(60).optional(), // shortName or slug
  universityId: uuidSchema.optional(),
  campusId: uuidSchema.optional(),
  city: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().max(80).optional(),
  minRent: z.coerce.number().int().min(0).max(500_000_000).optional(),
  maxRent: z.coerce.number().int().min(0).max(500_000_000).optional(),
  propertyType: z.enum(propertyTypes).optional(),
  furnishing: z.enum(["FURNISHED", "PARTIALLY_FURNISHED", "UNFURNISHED"]).optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  maxOccupants: z.coerce.number().int().min(1).max(50).optional(),
  amenities: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return [];
      const list = Array.isArray(v) ? v.flatMap((s) => s.split(",")) : v.split(",");
      return list
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is (typeof amenityKeys)[number] =>
          (amenityKeys as readonly string[]).includes(s),
        );
    }),
  maxDistanceKm: z.coerce.number().min(0).max(200).optional(),
  verified: booleanish,
  availableNow: booleanish,
  minRating: z.coerce.number().min(1).max(5).optional(),
  providerType: z.enum(["LANDLORD", "CARETAKER", "AGENT"]).optional(),
  sort: z
    .enum(["newest", "rent_asc", "rent_desc", "closest", "most_reviewed", "highest_rated"])
    .default("newest"),
});
export type PropertySearchInput = z.infer<typeof propertySearchSchema>;

export const savedSearchSchema = z.object({
  name: z.string().trim().min(2).max(80),
  query: z.record(z.string(), z.unknown()),
});
