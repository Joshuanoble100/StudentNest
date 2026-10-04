import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      emailVerified: true,
      deletedAt: true,
      passwordHash: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`ADMIN users: ${admins.length}`);
  for (const a of admins) {
    console.log(
      [
        `email=${a.email}`,
        `name=${a.name}`,
        `status=${a.status}`,
        `emailVerified=${a.emailVerified}`,
        `deletedAt=${a.deletedAt ? "SET" : "null"}`,
        `passwordHash=${a.passwordHash ? `${a.passwordHash.length} chars, prefix ${a.passwordHash.slice(0, 4)}` : "MISSING"}`,
      ].join(" | "),
    );
  }

  const byRole = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
  console.log("role counts:", JSON.stringify(byRole.map((r) => ({ role: r.role, n: r._count._all }))));

  const pendingProps = await prisma.property.count({ where: { status: "PENDING_REVIEW" } });
  const suspendedProps = await prisma.property.count({ where: { status: "SUSPENDED" } });
  const pendingVerifs = await prisma.verificationRequest.count({ where: { status: "PENDING" } });
  const openReports = await prisma.report.count({ where: { status: "OPEN" } });
  const underReviewReports = await prisma.report.count({ where: { status: "UNDER_REVIEW" } });
  const underReviewReviews = await prisma.review.count({ where: { status: "UNDER_REVIEW" } });
  const disputedReviews = await prisma.review.count({ where: { status: "DISPUTED" } });
  console.log(
    [
      `properties PENDING_REVIEW=${pendingProps} SUSPENDED=${suspendedProps}`,
      `verificationRequests PENDING=${pendingVerifs}`,
      `reports OPEN=${openReports} UNDER_REVIEW=${underReviewReports}`,
      `reviews UNDER_REVIEW=${underReviewReviews} DISPUTED=${disputedReviews}`,
    ].join(" | "),
  );

  const verifByType = await prisma.verificationRequest.groupBy({
    by: ["type", "status"],
    _count: { _all: true },
  });
  console.log(
    "verificationRequests by type/status:",
    JSON.stringify(verifByType.map((v) => ({ t: v.type, s: v.status, n: v._count._all }))),
  );
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
