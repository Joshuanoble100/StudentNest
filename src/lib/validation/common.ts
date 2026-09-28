import { z } from "zod";

export const uuidSchema = z.uuid({ error: "Invalid identifier" });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

/**
 * Nigerian phone numbers: 0803…, 0903…, +234803…, etc.
 * Accepts local (0XXXXXXXXXX) and international (+234XXXXXXXXXX) formats.
 */
export const nigerianPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+234|234|0)(70|80|81|90|91)\d{8}$/,
    "Enter a valid Nigerian phone number (e.g. 08031234567 or +2348031234567)",
  );

export const optionalPhoneSchema = z
  .union([z.literal(""), nigerianPhoneSchema])
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const ratingSchema = z.coerce.number().int().min(1).max(5);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be under 128 characters")
  .regex(/[a-zA-Z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const emailSchema = z.email("Enter a valid email address").max(254);
