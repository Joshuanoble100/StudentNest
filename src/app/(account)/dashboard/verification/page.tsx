import type { Metadata } from "next";
import { BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { listMyVerificationRequests } from "@/lib/services/verification.service";
import { PageHeader } from "@/components/account/page-header";
import { VerificationRequestForm } from "@/components/account/verification-request-form";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_TYPE_LABELS,
  VERIFICATION_EXPLAINER,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Verification" };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

const STATUS_VARIANT: Record<string, "verified" | "pending" | "rejected" | "neutral"> = {
  VERIFIED: "verified",
  PENDING: "pending",
  REJECTED: "rejected",
  SUSPENDED: "rejected",
};

export default async function VerificationPage() {
  const user = await requireRolePage(...PROVIDER_ROLES);

  const [{ requests, isVerified }, propertyVerifications] = await Promise.all([
    listMyVerificationRequests(user.id),
    prisma.propertyVerification.findMany({
      where: { property: { ownerId: user.id, deletedAt: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        rejectionReason: true,
        property: { select: { id: true, title: true, slug: true } },
      },
    }),
  ]);

  const hasPending = requests.some((r) => r.status === "PENDING");

  return (
    <div>
      <PageHeader
        title="Verification"
        description="Prove who you are and what you own. Your documents stay private."
      />

      <Alert variant={isVerified ? "success" : "warning"} className="mb-6">
        <AlertTitle>
          {isVerified ? (
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4" aria-hidden /> Your account is verified
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" aria-hidden /> Not verified yet
            </span>
          )}
        </AlertTitle>
        <p className="text-sm">{VERIFICATION_EXPLAINER}</p>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Submit a new request</CardTitle>
            <CardDescription>
              One request at a time. Attach clear photos — blurry documents are the most common
              reason for a rejection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationRequestForm hasPendingRequest={hasPending} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" aria-hidden /> Your account requests
              </CardTitle>
              <CardDescription>Only you and our moderation team can see these.</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-slate-500">
                  You have not submitted anything yet. Verification is free and is not required to
                  list — it only changes how students see your name.
                </p>
              ) : (
                <ul className="space-y-3">
                  {requests.map((request) => (
                    <li key={request.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {VERIFICATION_TYPE_LABELS[request.type as keyof typeof VERIFICATION_TYPE_LABELS] ?? request.type}
                        </p>
                        <Badge variant={STATUS_VARIANT[request.status] ?? "neutral"}>
                          {VERIFICATION_STATUS_LABELS[request.status as keyof typeof VERIFICATION_STATUS_LABELS] ?? request.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Submitted {formatDate(request.createdAt)}
                        {request.reviewedAt ? ` · decided ${formatDate(request.reviewedAt)}` : ""}
                        {request.documentUrls.length > 0
                          ? ` · ${request.documentUrls.length} document${request.documentUrls.length === 1 ? "" : "s"}`
                          : ""}
                      </p>
                      {request.rejectionReason && (
                        <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">
                          <span className="font-semibold">Why it was rejected: </span>
                          {request.rejectionReason}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property verification</CardTitle>
              <CardDescription>
                Checked per listing. A verified badge on one property says nothing about your
                other listings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {propertyVerifications.length === 0 ? (
                <EmptyState
                  title="No property checks yet"
                  description="Our team verifies a listing when it is first approved or when a student reports a problem with it."
                />
              ) : (
                <ul className="space-y-2">
                  {propertyVerifications.map((record) => (
                    <li key={record.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{record.property.title}</p>
                        <Badge variant={STATUS_VARIANT[record.status] ?? "neutral"}>
                          {VERIFICATION_STATUS_LABELS[record.status as keyof typeof VERIFICATION_STATUS_LABELS] ?? record.status}
                        </Badge>
                      </div>
                      {record.rejectionReason && (
                        <p className="mt-1 text-xs text-red-700">{record.rejectionReason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
