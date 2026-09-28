import { z } from "zod";
import { uuidSchema } from "./common";

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be under 2000 characters"),
});

export const startConversationSchema = z.object({
  recipientId: uuidSchema,
  propertyId: uuidSchema.optional(),
  subject: z.string().trim().max(120).default("GENERAL"),
  firstMessage: messageSchema.shape.body,
});

export const inquirySchema = z.object({
  propertyId: uuidSchema,
  type: z
    .enum(["AVAILABILITY", "VIEWING_REQUEST", "TOTAL_COST", "DISTANCE", "OTHER"])
    .default("AVAILABILITY"),
  message: z.string().trim().min(5).max(1000),
  viewingDate: z.coerce.date().nullable().optional(),
});

export const inquiryResponseSchema = z.object({
  inquiryId: uuidSchema,
  status: z.enum(["RESPONDED", "VIEWING_SCHEDULED", "CLOSED"]),
  response: z.string().trim().min(2).max(2000),
  viewingDate: z.coerce.date().nullable().optional(),
});

export const blockUserSchema = z.object({
  conversationId: uuidSchema,
  blocked: z.boolean(),
});

export const reportSchema = z.object({
  targetType: z.enum(["PROPERTY", "REVIEW", "USER", "MESSAGE", "CONVERSATION"]),
  targetId: uuidSchema,
  reason: z.enum([
    "FAKE_PROPERTY","SCAM","IMPERSONATION","SUSPICIOUS_PAYMENT_REQUEST","HARASSMENT",
    "MISLEADING_INFORMATION","FAKE_REVIEW","UNSAFE_BEHAVIOUR","SPAM","PERSONAL_INFORMATION",
    "THREATS","INAPPROPRIATE_CONTENT","EXTORTION","ADVERTISING","OTHER",
  ]),
  details: z.string().trim().max(2000).optional(),
  anonymous: z.boolean().default(false),
});
export type ReportInput = z.infer<typeof reportSchema>;
