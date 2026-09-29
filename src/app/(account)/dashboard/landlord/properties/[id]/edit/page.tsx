import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRolePage } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getOwnerProperty, PropertyNotFoundError } from "@/lib/services/property.service";
import { PageHeader } from "@/components/account/page-header";
import { PropertyForm, type PropertyFormInitial } from "@/components/property/property-form";
import type { ImageMeta } from "@/components/property/image-uploader";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { PROPERTY_STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit listing" };

const PROVIDER_ROLES = ["LANDLORD", "AGENT", "ADMIN"] as const;

const toDateString = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRolePage(...PROVIDER_ROLES);
  const { id } = await params;

  let property: Awaited<ReturnType<typeof getOwnerProperty>>;
  try {
    property = await getOwnerProperty(user, id);
  } catch (error) {
    if (error instanceof PropertyNotFoundError) notFound();
    throw error;
  }

  const [universities, campuses, neighborhoods] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, shortName: true } }),
    prisma.campus.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, universityId: true } }),
    prisma.neighborhood.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
  ]);

  const images: ImageMeta[] = property.images.map((img) => ({
    id: img.id,
    url: img.url,
    alt: img.alt,
    width: img.width,
    height: img.height,
    thumbUrl: img.thumbUrl,
    sortOrder: img.sortOrder,
    isCover: img.isCover,
  }));

  const initial: PropertyFormInitial = {
    id: property.id,
    title: property.title,
    description: property.description,
    providerType: property.providerType,
    propertyType: property.propertyType,
    rentAmount: property.rentAmount,
    rentPeriod: property.rentPeriod,
    cautionDeposit: property.cautionDeposit,
    agencyFee: property.agencyFee,
    serviceCharge: property.serviceCharge,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxOccupants: property.maxOccupants,
    furnishing: property.furnishing,
    availableNow: property.availableNow,
    availableFrom: toDateString(property.availableFrom),
    universityId: property.universityId,
    campusId: property.campusId,
    neighborhoodId: property.neighborhoodId,
    addressLine: property.addressLine,
    areaName: property.areaName,
    city: property.city,
    state: property.state,
    latitude: property.latitude == null ? null : Number(property.latitude),
    longitude: property.longitude == null ? null : Number(property.longitude),
    locationApproximate: property.locationApproximate,
    amenities: property.amenities.map((a) => a.key),
    features: property.features.map((f) => f.label),
    houseRules: property.houseRules,
    images,
    condition: property.condition
      ? {
          electricityAvailable: property.condition.electricityAvailable,
          generatorAvailable: property.condition.generatorAvailable,
          solarAvailable: property.condition.solarAvailable,
          prepaidMeter: property.condition.prepaidMeter,
          waterSource: property.condition.waterSource,
          internetType: property.condition.internetType,
          securityFeatures: property.condition.securityFeatures,
          electricityReliability: property.condition.electricityReliability,
          waterReliability: property.condition.waterReliability,
          networkQuality: property.condition.networkQuality,
          roadCondition: property.condition.roadCondition,
          noiseLevel: property.condition.noiseLevel,
          cleanliness: property.condition.cleanliness,
          floodRisk: property.condition.floodRisk,
        }
      : null,
  };

  return (
    <div>
      <PageHeader
        title="Edit listing"
        description={property.title}
        backHref="/dashboard/landlord/properties"
        backLabel="My listings"
      />

      <Alert variant="info" className="mb-5">
        <AlertTitle>
          Current status: {PROPERTY_STATUS_LABELS[property.status as keyof typeof PROPERTY_STATUS_LABELS] ?? property.status}
        </AlertTitle>
        <p className="text-sm">
          {property.status === "ACTIVE"
            ? "This listing is live. Changing the title, description, price, type or location takes it offline for re-review."
            : "This listing is not visible to students. Submit it for review when the details are final."}
        </p>
      </Alert>

      <PropertyForm
        initial={initial}
        universities={universities}
        campuses={campuses}
        neighborhoods={neighborhoods}
      />
    </div>
  );
}
