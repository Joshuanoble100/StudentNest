/**
 * StudentNest demo seed.
 *
 * Everything created here is explicitly demo data:
 *   - University / Campus / Neighborhood rows carry isDemoData = true
 *   - all accounts use the reserved @studentnest.test domain (no real mailboxes)
 *   - listing photos are generated placeholders labelled "DEMO IMAGE"
 *   - verification "documents" are placeholder files, never real IDs
 *
 * Trust labels are backed by real rows: a review is only marked
 * VERIFIED_REVIEWER when the author has an inquiry the owner responded to, and
 * VERIFIED_STAY rows carry an admin audit entry recording the confirmation.
 *
 * Run: npm run db:seed
 */
import "./seed/env"; // must stay first: loads .env before PrismaClient is built
import { PrismaClient, Prisma } from "@prisma/client";
import type { ReviewCategory } from "@prisma/client";
import { daysAgo, daysAhead, generateSeedImages, hash, hoursAgo, imageLabel, intBetween } from "./seed/helpers";
import type { SeedImage } from "./seed/helpers";
import { NEIGHBORHOODS, UNIVERSITIES } from "./seed/locations";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_PASSWORD_IS_GENERATED,
  OWNER_PASSWORD,
  ROOMMATES,
  STUDENT_PASSWORD,
  USERS,
} from "./seed/people";
import { PROPERTIES_A } from "./seed/properties-a";
import { PROPERTIES_B } from "./seed/properties-b";
import { REVIEWS } from "./seed/reviews";
import {
  FAVORITES,
  INQUIRIES,
  NOTIFICATIONS,
  REPORTS,
  SAVED_SEARCHES,
  THREADS,
  VERIFICATION_REQUESTS,
} from "./seed/activity";
import type { Ids, SeedProperty, UniKey, UserKey } from "./seed/types";

const prisma = new PrismaClient();

const PROPERTIES: SeedProperty[] = [...PROPERTIES_A, ...PROPERTIES_B];

const ALL_CATEGORIES: ReviewCategory[] = [
  "ELECTRICITY",
  "WATER",
  "SECURITY",
  "INTERNET",
  "CLEANLINESS",
  "LANDLORD_BEHAVIOUR",
  "MAINTENANCE",
  "ACCESSIBILITY",
  "VALUE_FOR_MONEY",
  "NOISE_ENVIRONMENT",
];

function newIds(): Ids {
  return {
    universities: new Map<UniKey, string>(),
    campuses: new Map<string, string>(),
    faculties: new Map<string, string>(),
    departments: new Map<string, string>(),
    neighborhoods: new Map<string, string>(),
    users: new Map<UserKey, string>(),
    properties: new Map<string, string>(),
  };
}

async function wipe(): Promise<void> {
  const models = [
    prisma.auditLog,
    prisma.webhookEvent,
    prisma.payment,
    prisma.notification,
    prisma.message,
    prisma.conversationParticipant,
    prisma.conversation,
    prisma.inquiry,
    prisma.favoriteProperty,
    prisma.savedSearch,
    prisma.favoriteRoommate,
    prisma.roommatePreference,
    prisma.roommateProfile,
    prisma.reviewReport,
    prisma.landlordResponse,
    prisma.reviewCategoryRating,
    prisma.review,
    prisma.report,
    prisma.verificationRequest,
    prisma.propertyVerification,
    prisma.propertyAvailability,
    prisma.propertyCondition,
    prisma.propertyFeature,
    prisma.propertyAmenity,
    prisma.propertyImage,
    prisma.property,
    prisma.neighborhood,
    prisma.department,
    prisma.faculty,
    prisma.campus,
    prisma.notificationPreference,
    prisma.profile,
    prisma.authToken,
    prisma.account,
    prisma.user,
    prisma.university,
    // Prisma's per-model delegates do not share a callable signature, so the
    // list is narrowed to the one method used here.
  ] as unknown as { deleteMany(): Promise<unknown> }[];

  for (const model of models) await model.deleteMany();
}

async function seedLocations(ids: Ids): Promise<void> {
  for (const uni of UNIVERSITIES) {
    const created = await prisma.university.create({
      data: {
        name: uni.name,
        shortName: uni.shortName,
        slug: uni.slug,
        city: uni.city,
        state: uni.state,
        isDemoData: true,
      },
    });
    ids.universities.set(uni.key, created.id);

    for (const campus of uni.campuses) {
      const row = await prisma.campus.create({
        data: {
          universityId: created.id,
          name: campus.name,
          slug: campus.slug,
          city: campus.city ?? uni.city,
          latitude: campus.latitude,
          longitude: campus.longitude,
          isDemoData: true,
        },
      });
      ids.campuses.set(`${uni.key}:${campus.slug}`, row.id);
    }

    for (const faculty of uni.faculties ?? []) {
      const row = await prisma.faculty.create({
        data: { universityId: created.id, name: faculty.name },
      });
      ids.faculties.set(`${uni.key}:${faculty.name}`, row.id);
      for (const department of faculty.departments) {
        const dept = await prisma.department.create({
          data: { facultyId: row.id, name: department },
        });
        ids.departments.set(`${uni.key}:${faculty.name}:${department}`, dept.id);
      }
    }
  }

  for (const hood of NEIGHBORHOODS) {
    const row = await prisma.neighborhood.create({
      data: {
        name: hood.name,
        slug: hood.slug,
        city: hood.city,
        state: hood.state,
        latitude: hood.latitude,
        longitude: hood.longitude,
        isDemoData: true,
      },
    });
    ids.neighborhoods.set(hood.slug, row.id);
  }
}

async function seedUsers(ids: Ids): Promise<void> {
  for (const seedUser of USERS) {
    const user = await prisma.user.create({
      data: {
        email: seedUser.email,
        name: seedUser.name,
        role: seedUser.role,
        passwordHash: await hash(seedUser.password),
        phone: seedUser.phone ?? null,
        status: "ACTIVE",
        emailVerified: seedUser.emailVerified ? daysAgo(200) : null,
        createdAt: daysAgo(seedUser.createdAtDaysAgo ?? 100),
      },
    });
    ids.users.set(seedUser.key, user.id);

    await prisma.profile.create({
      data: {
        userId: user.id,
        displayName: seedUser.name,
        bio: seedUser.bio ?? null,
        gender: seedUser.gender ?? null,
        universityId: seedUser.university ? ids.universities.get(seedUser.university) ?? null : null,
        campusId:
          seedUser.university && seedUser.campus
            ? ids.campuses.get(`${seedUser.university}:${seedUser.campus}`) ?? null
            : null,
        facultyId:
          seedUser.university && seedUser.faculty
            ? ids.faculties.get(`${seedUser.university}:${seedUser.faculty}`) ?? null
            : null,
        departmentId:
          seedUser.university && seedUser.faculty && seedUser.department
            ? ids.departments.get(`${seedUser.university}:${seedUser.faculty}:${seedUser.department}`) ?? null
            : null,
        level: seedUser.level ?? null,
        notificationPreference: { create: {} },
      },
    });
  }
}

async function seedProperties(ids: Ids, images: SeedImage[]): Promise<void> {
  for (const p of PROPERTIES) {
    const ownerId = ids.users.get(p.owner)!;
    const universityId = ids.universities.get(p.university)!;
    const campusId = p.campus ? ids.campuses.get(`${p.university}:${p.campus}`) ?? null : null;
    const neighborhoodId = p.neighborhood ? ids.neighborhoods.get(p.neighborhood) ?? null : null;
    const availableFrom = p.availableFromDaysAhead ? daysAhead(p.availableFromDaysAhead) : null;

    const property = await prisma.property.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        houseRules: p.houseRules ?? null,
        ownerId,
        providerType: p.providerType,
        status: p.status,
        verificationStatus: p.verificationStatus,
        propertyType: p.propertyType,
        rentAmount: p.rentAmount,
        rentPeriod: p.rentPeriod,
        cautionDeposit: p.cautionDeposit ?? null,
        agencyFee: p.agencyFee ?? null,
        serviceCharge: p.serviceCharge ?? null,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        maxOccupants: p.maxOccupants,
        furnishing: p.furnishing,
        availableNow: p.availableNow ?? true,
        availableFrom,
        universityId,
        campusId,
        neighborhoodId,
        addressLine: p.addressLine ?? null,
        areaName: p.areaName,
        city: p.city,
        state: p.state,
        latitude: p.latitude,
        longitude: p.longitude,
        locationApproximate: p.locationApproximate ?? false,
        distanceKmToCampus: p.distanceKmToCampus ?? null,
        isFeatured: p.isFeatured ?? false,
        viewCount: intBetween(15, 520),
        createdAt: daysAgo(p.createdAtDaysAgo),
        amenities: { create: p.amenities.map((key) => ({ key })) },
        features: { create: p.features.map((label) => ({ label })) },
        condition: {
          create: {
            electricityAvailable: p.condition.electricityAvailable,
            generatorAvailable: p.condition.generatorAvailable ?? false,
            solarAvailable: p.condition.solarAvailable ?? false,
            prepaidMeter: p.condition.prepaidMeter ?? false,
            waterSource: p.condition.waterSource,
            internetType: p.condition.internetType,
            securityFeatures: p.condition.securityFeatures,
            electricityReliability: p.condition.electricityReliability ?? null,
            waterReliability: p.condition.waterReliability ?? null,
            networkQuality: p.condition.networkQuality ?? null,
            roadCondition: p.condition.roadCondition ?? null,
            noiseLevel: p.condition.noiseLevel ?? null,
            cleanliness: p.condition.cleanliness ?? null,
            floodRisk: p.condition.floodRisk ?? "UNKNOWN",
          },
        },
      },
    });
    ids.properties.set(p.slug, property.id);

    if (images.length > 0 && p.images > 0) {
      const start = p.slug.length % images.length;
      await prisma.propertyImage.createMany({
        data: Array.from({ length: Math.min(p.images, images.length) }, (_, i) => {
          const image = images[(start + i) % images.length]!;
          return {
            propertyId: property.id,
            url: image.url,
            thumbUrl: image.thumbUrl,
            width: image.width,
            height: image.height,
            alt: `${p.title} — demo ${imageLabel(start + i).toLowerCase()} photo`,
            sortOrder: i,
            isCover: i === 0,
          };
        }),
      });
    }

    // Verification history: a rejected attempt is kept when one happened, so
    // admins can see how the current decision was reached.
    if (p.rejectionReason && p.verificationStatus !== "REJECTED") {
      await prisma.propertyVerification.create({
        data: {
          propertyId: property.id,
          status: "REJECTED",
          submittedById: ownerId,
          reviewedById: ids.users.get("admin") ?? null,
          rejectionReason: p.rejectionReason,
          reviewedAt: daysAgo(p.createdAtDaysAgo - 1),
          createdAt: daysAgo(p.createdAtDaysAgo),
        },
      });
    }

    if (p.verificationStatus === "PENDING" && p.status !== "DRAFT") {
      await prisma.propertyVerification.create({
        data: {
          propertyId: property.id,
          status: "PENDING",
          submittedById: ownerId,
          createdAt: daysAgo(p.createdAtDaysAgo),
        },
      });
    } else if (p.verificationStatus !== "PENDING") {
      await prisma.propertyVerification.create({
        data: {
          propertyId: property.id,
          status: p.verificationStatus,
          submittedById: ownerId,
          reviewedById: ids.users.get("admin") ?? null,
          evidenceNote: p.verificationNote ?? null,
          rejectionReason: p.verificationStatus === "REJECTED" || p.verificationStatus === "SUSPENDED" ? (p.rejectionReason ?? null) : null,
          reviewedAt: daysAgo(Math.max(1, p.createdAtDaysAgo - 3)),
          createdAt: daysAgo(p.createdAtDaysAgo),
        },
      });
    }

    if (availableFrom && p.availableNow === false) {
      await prisma.propertyAvailability.create({
        data: {
          propertyId: property.id,
          roomsAvailable: 1,
          availableFrom,
          note: "Next intake date given by the owner.",
        },
      });
    }
  }
}

async function seedInquiries(ids: Ids): Promise<void> {
  for (const row of INQUIRIES) {
    const propertyId = ids.properties.get(row.property)!;
    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      select: { ownerId: true },
    });
    await prisma.inquiry.create({
      data: {
        propertyId,
        studentId: ids.users.get(row.student)!,
        ownerId: property.ownerId,
        type: row.type,
        message: row.message,
        status: row.status,
        ownerResponse: row.ownerResponse ?? null,
        respondedAt: row.ownerResponse ? daysAgo(Math.max(0, row.daysAgo - 1)) : null,
        viewingDate: row.viewingInDays ? daysAhead(row.viewingInDays) : null,
        createdAt: daysAgo(row.daysAgo),
      },
    });
  }
}

function categoryRatingsFor(overall: number, overrides: Partial<Record<ReviewCategory, number>> = {}) {
  return ALL_CATEGORIES.map((category) => {
    const override = overrides[category];
    if (override !== undefined) return { category, rating: override };
    const jitter = intBetween(-1, 1);
    return { category, rating: Math.max(1, Math.min(5, overall + jitter)) };
  });
}

async function seedReviews(ids: Ids): Promise<void> {
  const adminId = ids.users.get("admin")!;
  const adminEmail = ADMIN_EMAIL;

  for (const r of REVIEWS) {
    const propertyId = ids.properties.get(r.property)!;
    const authorId = ids.users.get(r.author)!;
    const stayFrom = r.stayFromDaysAgo ? daysAgo(r.stayFromDaysAgo) : null;

    const review = await prisma.review.create({
      data: {
        propertyId,
        authorId,
        overallRating: r.overall,
        title: r.title,
        body: r.body,
        photos: [],
        stayKey: stayFrom ? `${stayFrom.getFullYear()}-${String(stayFrom.getMonth() + 1).padStart(2, "0")}` : "main",
        dateStayedFrom: stayFrom,
        dateStayedTo: stayFrom && r.months ? new Date(stayFrom.getTime() + r.months * 30 * 86_400_000) : null,
        stayDurationMonths: r.months ?? null,
        status: r.status,
        verification: r.verification,
        moderationReason: r.moderationReason ?? null,
        moderatedById: r.moderationReason ? adminId : null,
        moderatedAt: r.moderationReason ? daysAgo(Math.max(1, r.daysAgo - 1)) : null,
        createdAt: daysAgo(r.daysAgo),
        categoryRatings: { create: categoryRatingsFor(r.overall, r.categoryOverrides) },
      },
    });

    if (r.verification === "VERIFIED_STAY") {
      // VERIFIED_STAY is only ever granted by an admin decision — record it.
      await prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: "review.confirm_stay",
          entityType: "Review",
          entityId: review.id,
          metadata: { propertyId, note: "Demo seed: stay confirmed from owner tenancy records." } as Prisma.InputJsonValue,
          createdAt: daysAgo(Math.max(1, r.daysAgo - 1)),
        },
      });
    }

    if (r.moderationReason) {
      await prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorEmail: adminEmail,
          action: "review.hide",
          entityType: "Review",
          entityId: review.id,
          metadata: { reason: r.moderationReason } as Prisma.InputJsonValue,
          createdAt: daysAgo(Math.max(1, r.daysAgo - 1)),
        },
      });
    }

    if (r.response) {
      const property = await prisma.property.findUniqueOrThrow({
        where: { id: propertyId },
        select: { ownerId: true },
      });
      await prisma.landlordResponse.create({
        data: {
          reviewId: review.id,
          authorId: property.ownerId,
          body: r.response,
          createdAt: daysAgo(Math.max(1, r.daysAgo - 2)),
        },
      });
    }
  }
}

async function seedMessaging(ids: Ids): Promise<void> {
  for (const thread of THREADS) {
    const aId = ids.users.get(thread.a)!;
    const bId = ids.users.get(thread.b)!;
    const [first, second] = [aId, bId].sort();
    const propertyId = thread.property ? ids.properties.get(thread.property) ?? null : null;
    const subject = propertyId ?? thread.subject;

    const conversation = await prisma.conversation.create({
      data: {
        participantKey: `${first}:${second}`,
        userAId: first,
        userBId: second,
        propertyId,
        subject,
        lastMessageAt: hoursAgo(thread.messages[thread.messages.length - 1]!.hoursAgo),
        participants: {
          create: [{ userId: first }, { userId: second, lastReadAt: hoursAgo(2) }],
        },
      },
    });

    for (const message of thread.messages) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: ids.users.get(message.from)!,
          body: message.body,
          readAt: hoursAgo(Math.max(0, message.hoursAgo - 1)),
          createdAt: hoursAgo(message.hoursAgo),
        },
      });
    }
  }
}

async function seedRoommates(ids: Ids): Promise<void> {
  const profileIds = new Map<UserKey, string>();

  for (const p of ROOMMATES) {
    const profile = await prisma.roommateProfile.create({
      data: {
        userId: ids.users.get(p.key)!,
        status: p.status ?? "ACTIVE",
        universityId: ids.universities.get(p.university)!,
        campusId: p.campus ? ids.campuses.get(`${p.university}:${p.campus}`) ?? null : null,
        preferredLocations: p.locations,
        budgetMin: p.budgetMin,
        budgetMax: p.budgetMax,
        preferredRoomType: p.roomType ?? null,
        desiredRoommates: p.desiredRoommates,
        genderPreference: p.genderPreference ?? null,
        smoking: p.smoking ?? false,
        pets: false,
        cleanliness: p.cleanliness,
        sleepSchedule: p.sleepSchedule,
        studyHabits: p.studyHabits,
        socialPreference: p.socialPreference,
        noiseTolerance: p.noiseTolerance,
        moveInDate: daysAhead(p.moveInDays),
        bio: p.bio,
        preference: {
          create: {
            budgetWeight: p.weights?.budget ?? 25,
            locationWeight: p.weights?.location ?? 20,
            moveInWeight: p.weights?.moveIn ?? 20,
            lifestyleWeight: p.weights?.lifestyle ?? 35,
          },
        },
      },
    });
    profileIds.set(p.key, profile.id);
  }

  const saved: [UserKey, UserKey][] = [
    ["chi", "kevin"],
    ["chi", "grace"],
    ["kevin", "tolu"],
    ["grace", "aisha"],
    ["halima", "chi"],
  ];
  for (const [user, target] of saved) {
    const targetId = profileIds.get(target);
    if (!targetId) continue;
    await prisma.favoriteRoommate.create({ data: { userId: ids.users.get(user)!, roommateProfileId: targetId } });
  }
}

async function seedFavoritesAndSearches(ids: Ids): Promise<void> {
  for (const row of FAVORITES) {
    const propertyId = ids.properties.get(row.property)!;
    const property = await prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      select: { rentAmount: true },
    });
    await prisma.favoriteProperty.create({
      data: {
        userId: ids.users.get(row.user)!,
        propertyId,
        savedRentAmount: property.rentAmount,
        createdAt: daysAgo(intBetween(1, 40)),
      },
    });
  }

  for (const search of SAVED_SEARCHES) {
    await prisma.savedSearch.create({
      data: {
        userId: ids.users.get(search.user)!,
        name: search.name,
        query: search.query as Prisma.InputJsonValue,
        createdAt: daysAgo(intBetween(2, 30)),
      },
    });
  }
}

async function seedTrustQueues(ids: Ids): Promise<void> {
  const adminId = ids.users.get("admin")!;

  for (const request of VERIFICATION_REQUESTS) {
    await prisma.verificationRequest.create({
      data: {
        userId: ids.users.get(request.user)!,
        type: request.type,
        status: request.status,
        // Placeholder metadata — a real submission stores document references only,
        // and documents themselves live in private storage, never in the database.
        submittedData: {
          demo: true,
          documentType: request.type === "AGENCY_LICENSE" ? "Estate agency licence" : "Government ID",
          submittedBy: "seed script",
        } as Prisma.InputJsonValue,
        documentUrls: ["/uploads/seed/demo-document-placeholder.txt"],
        reviewedById: request.status === "PENDING" ? null : adminId,
        rejectionReason: request.status === "REJECTED" ? (request.note ?? null) : null,
        reviewedAt: request.status === "PENDING" ? null : daysAgo(Math.max(1, request.daysAgo - 1)),
        createdAt: daysAgo(request.daysAgo),
      },
    });
  }

  for (const report of REPORTS) {
    let targetId: string;
    if (report.target.kind === "property") {
      targetId = ids.properties.get(report.target.slug)!;
    } else if (report.target.kind === "user") {
      targetId = ids.users.get(report.target.user)!;
    } else {
      const message = await prisma.message.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } });
      targetId = message?.id ?? ids.users.get("chi")!;
    }

    await prisma.report.create({
      data: {
        targetType: report.targetType,
        targetId,
        reason: report.reason,
        details: report.details,
        reporterId: report.anonymous || !report.reporter ? null : ids.users.get(report.reporter) ?? null,
        anonymous: report.anonymous ?? false,
        status: report.status,
        handledById: report.status === "RESOLVED" ? adminId : null,
        resolution: report.resolution ?? null,
        handledAt: report.status === "RESOLVED" ? daysAgo(Math.max(1, report.daysAgo - 2)) : null,
        createdAt: daysAgo(report.daysAgo),
      },
    });
  }

  // A report against a review uses the dedicated table (FK-backed).
  const publishedUnverified = await prisma.review.findFirst({
    where: { status: "PUBLISHED", verification: "UNVERIFIED" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (publishedUnverified) {
    await prisma.reviewReport.create({
      data: {
        reviewId: publishedUnverified.id,
        reason: "MISLEADING_INFORMATION",
        details: "The review describes a road condition that was repaired two months ago.",
        reporterId: ids.users.get("tunde") ?? null,
        anonymous: false,
        status: "OPEN",
        createdAt: daysAgo(4),
      },
    });
  }

  const hiddenReview = await prisma.review.findFirst({ where: { status: "HIDDEN" }, select: { id: true } });
  if (hiddenReview) {
    await prisma.reviewReport.create({
      data: {
        reviewId: hiddenReview.id,
        reason: "FAKE_REVIEW",
        details: "Contains an accusation with no supporting evidence and abusive language.",
        reporterId: ids.users.get("emeka") ?? null,
        anonymous: false,
        status: "OPEN",
        createdAt: daysAgo(8),
      },
    });
  }

  for (const n of NOTIFICATIONS) {
    await prisma.notification.create({
      data: {
        userId: ids.users.get(n.user)!,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link ?? null,
        read: n.read ?? false,
        createdAt: n.daysAgo === 0 ? hoursAgo(1) : daysAgo(n.daysAgo),
      },
    });
  }
}

async function seedAuditAndPayments(ids: Ids): Promise<void> {
  const adminId = ids.users.get("admin")!;
  const prop = (slug: string) => ids.properties.get(slug)!;

  const entries: { action: string; entityType: string; entityId: string; metadata: Record<string, unknown>; daysAgo: number }[] = [
    {
      action: "property.approve",
      entityType: "Property",
      entityId: prop("sunrise-lodge-self-contain-awka"),
      metadata: { verificationStatus: "VERIFIED", note: "Site visit completed" },
      daysAgo: 59,
    },
    {
      action: "property.reject",
      entityType: "Property",
      entityId: prop("odenigbo-self-contain-nsukka-not-approved"),
      metadata: { reason: "Photos did not match the stated address" },
      daysAgo: 44,
    },
    {
      action: "property.suspend",
      entityType: "Property",
      entityId: prop("ifite-suspicious-listing-awka-suspended"),
      metadata: { reason: "Below-market price plus payment-before-inspection requests" },
      daysAgo: 8,
    },
    {
      action: "verification.approve",
      entityType: "VerificationRequest",
      entityId: prop("futa-gate-self-contain-akure"),
      metadata: { attempt: 2, note: "Address, meter number and photos matched on site visit" },
      daysAgo: 66,
    },
    {
      action: "verification.reject",
      entityType: "VerificationRequest",
      entityId: prop("futa-gate-self-contain-akure"),
      metadata: { attempt: 1, reason: "Photos showed a different building" },
      daysAgo: 72,
    },
    {
      action: "report.resolve",
      entityType: "Report",
      entityId: "seed-message-report",
      metadata: { resolution: "Warning issued; no content removed" },
      daysAgo: 2,
    },
  ];

  for (const entry of entries) {
    await prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorEmail: ADMIN_EMAIL,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: { demo: true, ...entry.metadata } as Prisma.InputJsonValue,
        createdAt: daysAgo(entry.daysAgo),
      },
    });
  }

  await prisma.payment.createMany({
    data: [
      {
        userId: ids.users.get("emeka")!,
        purpose: "FEATURED_LISTING",
        amountKobo: 500000,
        status: "SUCCESS",
        provider: "MOCK",
        reference: `sn_seed_featured_${Date.now()}`,
        propertyId: prop("sunrise-lodge-self-contain-awka"),
        metadata: { demo: true, note: "Mock provider — no real payment was processed." } as Prisma.InputJsonValue,
        createdAt: daysAgo(30),
      },
      {
        userId: ids.users.get("segun")!,
        purpose: "VERIFIED_LANDLORD_SERVICE",
        amountKobo: 250000,
        status: "FAILED",
        provider: "MOCK",
        reference: `sn_seed_failed_${Date.now()}`,
        metadata: { demo: true, reason: "Simulated provider decline." } as Prisma.InputJsonValue,
        createdAt: daysAgo(7),
      },
    ],
  });
}

/** Denormalized aggregates must match what the services would compute. */
async function recomputeAggregates(ids: Ids): Promise<void> {
  for (const [, propertyId] of ids.properties) {
    const published = await prisma.review.aggregate({
      where: { propertyId, status: "PUBLISHED", deletedAt: null },
      _avg: { overallRating: true },
      _count: { id: true },
    });
    const favorites = await prisma.favoriteProperty.count({ where: { propertyId } });
    const inquiries = await prisma.inquiry.count({ where: { propertyId } });

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        avgRating: published._avg.overallRating ?? 0,
        reviewCount: published._count.id,
        favoriteCount: favorites,
        inquiryCount: inquiries,
      },
    });
  }
}

function printSummary(): void {
  const line = (label: string, value: string) => console.log(`  ${label.padEnd(34)} ${value}`);
  console.log("\n" + "=".repeat(78));
  console.log("StudentNest demo data seeded.");
  console.log("All accounts, properties, reviews and documents are DEMO DATA.");
  console.log("=".repeat(78));
  console.log("\nAdmin");
  line("email", ADMIN_EMAIL);
  line("password", ADMIN_PASSWORD);
  if (ADMIN_PASSWORD_IS_GENERATED) {
    console.log(
      "  ^ generated for this run because SEED_ADMIN_PASSWORD is unset. It is stored\n" +
        "    only as a bcrypt hash, so this is the one time it is shown — copy it now, or\n" +
        "    set SEED_ADMIN_PASSWORD in .env and re-run to pick your own.",
    );
  }
  console.log("\nLandlords / agents (password for all: " + OWNER_PASSWORD + ")");
  for (const user of USERS.filter((u) => u.role === "LANDLORD" || u.role === "AGENT")) {
    line(user.email, `${user.role.toLowerCase()} — ${user.name}`);
  }
  console.log("\nStudents (password for all: " + STUDENT_PASSWORD + ")");
  for (const user of USERS.filter((u) => u.role === "STUDENT")) {
    line(user.email, user.name);
  }
  console.log("\nUseful pages");
  line("home", "/");
  line("search + filters", "/properties");
  line("example listing", "/properties/sunrise-lodge-self-contain-awka");
  line("admin dashboard", "/admin");
  console.log("=".repeat(78) + "\n");
}

async function main(): Promise<void> {
  // `wipe()` below deletes every row. Refuse to run where that would be
  // irreversible, rather than trusting the operator to have read the README.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[seed] refusing to run with NODE_ENV=production — the seeder wipes the database first " +
        "and creates demo accounts. Create a first admin with a one-off script instead.",
    );
  }

  const started = Date.now();
  console.log("[seed] generating placeholder images…");
  const images = await generateSeedImages();

  console.log("[seed] clearing existing rows…");
  await wipe();

  const ids = newIds();

  console.log("[seed] universities, campuses and neighborhoods…");
  await seedLocations(ids);

  console.log("[seed] users and profiles…");
  await seedUsers(ids);

  console.log(`[seed] ${PROPERTIES.length} properties with images, amenities and conditions…`);
  await seedProperties(ids, images);

  console.log("[seed] inquiries…");
  await seedInquiries(ids);

  console.log(`[seed] ${REVIEWS.length} reviews with category ratings…`);
  await seedReviews(ids);

  console.log("[seed] conversations and messages…");
  await seedMessaging(ids);

  console.log("[seed] roommate profiles and matching weights…");
  await seedRoommates(ids);

  console.log("[seed] favorites and saved searches…");
  await seedFavoritesAndSearches(ids);

  console.log("[seed] verification requests, reports and notifications…");
  await seedTrustQueues(ids);

  console.log("[seed] audit log and demo payments…");
  await seedAuditAndPayments(ids);

  console.log("[seed] recomputing rating and count aggregates…");
  await recomputeAggregates(ids);

  printSummary();
  console.log(`[seed] done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main()
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
