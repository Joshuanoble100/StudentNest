import { z } from "zod";
import { emailSchema, passwordSchema, optionalPhoneSchema, uuidSchema } from "./common";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: emailSchema,
  password: passwordSchema,
  phone: optionalPhoneSchema,
  role: z.enum(["STUDENT", "LANDLORD", "AGENT"], {
    error: "Choose a valid account type",
  }),
  universityId: uuidSchema.optional(),
  campusId: uuidSchema.optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).nullable().optional(),
  universityId: uuidSchema.nullable().optional(),
  campusId: uuidSchema.nullable().optional(),
  facultyId: uuidSchema.nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  level: z.string().trim().max(40).nullable().optional(),
  phone: optionalPhoneSchema,
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const notificationPreferenceSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inquiryEmails: z.boolean().optional(),
  messageEmails: z.boolean().optional(),
  matchEmails: z.boolean().optional(),
  reviewEmails: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});
