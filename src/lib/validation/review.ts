import { z } from "zod";
import { ratingSchema, uuidSchema } from "./common";

const reviewCategories = [
  "ELECTRICITY","WATER","SECURITY","INTERNET","CLEANLINESS","LANDLORD_BEHAVIOUR",
  "MAINTENANCE","ACCESSIBILITY","VALUE_FOR_MONEY","NOISE_ENVIRONMENT",
] as const;

export const reviewCreateSchema = z.object({
  overallRating: ratingSchema,
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(30, "Please write at least 30 characters so your review is useful").max(4000),
  categoryRatings: z
    .array(
      z.object({
        category: z.enum(reviewCategories),
        rating: ratingSchema,
      }),
    )
    .max(reviewCategories.length)
    .refine(
      (items) => new Set(items.map((i) => i.category)).size === items.length,
      "Duplicate category ratings",
    )
    .default([]),
  dateStayedFrom: z.coerce.date().nullable().optional(),
  dateStayedTo: z.coerce.date().nullable().optional(),
  stayDurationMonths: z.coerce.number().int().min(1).max(240).nullable().optional(),
  photos: z.array(z.string().max(2048)).max(6).default([]),
  /// Set when the student references an inquiry/booking used for verification.
  inquiryId: uuidSchema.optional(),
});
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

export const reviewUpdateSchema = reviewCreateSchema.partial().extend({
  reviewId: uuidSchema,
});

export const reviewReportSchema = z.object({
  reason: z.enum([
    "SPAM","HARASSMENT","FAKE_REVIEW","PERSONAL_INFORMATION","THREATS",
    "INAPPROPRIATE_CONTENT","EXTORTION","ADVERTISING","OTHER",
  ]),
  details: z.string().trim().max(1000).optional(),
  anonymous: z.boolean().default(false),
});

export const landlordResponseSchema = z.object({
  body: z.string().trim().min(5, "Write at least 5 characters").max(2000),
});

export const reviewModerationSchema = z.object({
  reviewId: uuidSchema,
  action: z.enum(["APPROVE", "HIDE", "REJECT", "RESTORE", "DISPUTE"]),
  reason: z.string().trim().max(1000).optional(),
});
