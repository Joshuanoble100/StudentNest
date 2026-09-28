import { prisma } from "@/lib/prisma";
import { createNotification } from "./notification.service";

export class InquiryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function createInquiry(
  student: { id: string; role: string },
  input: { propertyId: string; type: string; message: string; viewingDate?: Date | null },
) {
  if (student.role !== "STUDENT") {
    throw new InquiryError("Only student accounts can send inquiries", 403);
  }

  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, ownerId: true, status: true, deletedAt: true, slug: true, title: true },
  });
  if (!property || property.deletedAt || property.status !== "ACTIVE") {
    throw new InquiryError("Property not found", 404);
  }
  if (property.ownerId === student.id) {
    throw new InquiryError("You cannot inquire about your own listing", 400);
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      propertyId: property.id,
      studentId: student.id,
      ownerId: property.ownerId,
      type: input.type as never,
      message: input.message,
      viewingDate: input.viewingDate ?? null,
    },
  });

  await prisma.property.update({
    where: { id: property.id },
    data: { inquiryCount: { increment: 1 } },
  });

  await createNotification({
    userId: property.ownerId,
    type: "INQUIRY_NEW",
    title: "New property inquiry",
    body: `${input.message.slice(0, 100)}`,
    link: "/dashboard/landlord/inquiries",
  });

  return inquiry;
}

export async function respondToInquiry(
  owner: { id: string },
  input: { inquiryId: string; status: "RESPONDED" | "VIEWING_SCHEDULED" | "CLOSED"; response: string; viewingDate?: Date | null },
) {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: input.inquiryId },
    include: { property: { select: { slug: true, title: true } } },
  });
  if (!inquiry) throw new InquiryError("Inquiry not found", 404);
  if (inquiry.ownerId !== owner.id) throw new InquiryError("Not your inquiry", 403);
  if (inquiry.status === "CLOSED") throw new InquiryError("This inquiry is closed", 400);

  const updated = await prisma.inquiry.update({
    where: { id: input.inquiryId },
    data: {
      status: input.status,
      ownerResponse: input.response,
      respondedAt: new Date(),
      viewingDate: input.viewingDate ?? inquiry.viewingDate,
    },
  });

  await createNotification({
    userId: inquiry.studentId,
    type: "INQUIRY_RESPONSE",
    title: `Response about ${inquiry.property.title}`,
    body: input.response.slice(0, 140),
    link: `/properties/${inquiry.property.slug}`,
  });

  return updated;
}

export async function listInquiriesForOwner(ownerId: string, status?: string, page = 1, pageSize = 20) {
  const where = { ownerId, ...(status ? { status: status as never } : {}) };
  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        property: { select: { id: true, slug: true, title: true } },
        student: { select: { id: true, name: true, profile: { select: { avatarUrl: true } } } },
      },
    }),
    prisma.inquiry.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function listInquiriesForStudent(studentId: string, page = 1, pageSize = 20) {
  const where = { studentId };
  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        property: {
          select: {
            id: true, slug: true, title: true,
            images: { where: { isCover: true }, take: 1, select: { url: true, thumbUrl: true } },
          },
        },
      },
    }),
    prisma.inquiry.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
