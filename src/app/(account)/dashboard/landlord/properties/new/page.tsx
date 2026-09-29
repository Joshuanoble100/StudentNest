import type { Metadata } from "next";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/account/page-header";
import { EMPTY_PROPERTY_FORM, PropertyForm } from "@/components/property/property-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Add a listing" };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

export default async function NewPropertyPage() {
  const user = await requireRolePage(...PROVIDER_ROLES);

  const [universities, campuses, neighborhoods] = await Promise.all([
    prisma.university.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, shortName: true },
    }),
    prisma.campus.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, universityId: true } }),
    prisma.neighborhood.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Add a listing"
        description="Accurate listings get approved faster and attract fewer wasted viewings."
        backHref="/dashboard/landlord/properties"
        backLabel="My listings"
      />
      <PropertyForm
        initial={{
          ...EMPTY_PROPERTY_FORM,
          providerType: user.role === "AGENT" ? "AGENT" : "LANDLORD",
        }}
        universities={universities}
        campuses={campuses}
        neighborhoods={neighborhoods}
      />
    </div>
  );
}
