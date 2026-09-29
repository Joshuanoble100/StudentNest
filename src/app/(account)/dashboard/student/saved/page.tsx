import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Heart } from "lucide-react";
import { requireUserPage } from "@/lib/auth-helpers";
import { listFavoriteProperties } from "@/lib/services/property.service";
import { listSavedSearches } from "@/lib/services/saved-search.service";
import { PageHeader } from "@/components/account/page-header";
import { SavedSearchList } from "@/components/account/saved-search-list";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Saved properties & searches" };

/** Coerces a stored saved-search query into plain string params for links. */
function toParams(query: unknown): Record<string, string> {
  if (!query || typeof query !== "object" || Array.isArray(query)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (typeof value === "number" || typeof value === "boolean") out[key] = String(value);
  }
  return out;
}

export default async function SavedPage() {
  const user = await requireUserPage("/dashboard/student/saved");

  const [favorites, savedSearches] = await Promise.all([
    listFavoriteProperties(user.id),
    listSavedSearches(user.id),
  ]);

  const priceChanges = favorites.filter((f) => f.priceChanged);

  return (
    <div>
      <PageHeader
        title="Saved & searches"
        description="Properties you saved and the filter combinations you kept. We tell you when a saved listing changes price."
      />

      {priceChanges.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">{priceChanges.length}</strong> saved{" "}
          {priceChanges.length === 1 ? "listing has" : "listings have"} changed rent since you saved{" "}
          {priceChanges.length === 1 ? "it" : "them"}. Those are marked below.
        </p>
      )}

      <section aria-labelledby="saved-properties">
        <h2 id="saved-properties" className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Heart className="h-4 w-4 text-brand-700" aria-hidden /> Saved properties
          <span className="text-sm font-normal text-slate-500">({favorites.length})</span>
        </h2>

        {favorites.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-9 w-9" aria-hidden />}
            title="No saved properties"
            description="Tap the heart on any listing to keep it here for later."
            action={
              <Button asChild variant="outline">
                <Link href="/properties">Browse listings</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((row) => (
              <div key={row.favoriteId}>
                {row.priceChanged && (
                  <p className="mb-1 text-xs font-semibold text-amber-700">
                    Was {formatNaira(row.savedRentAmount)} when you saved · now{" "}
                    {formatNaira(row.property.rentAmount)}
                  </p>
                )}
                <PropertyCard property={row.property} isFavorited />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="saved-searches">
        <h2 id="saved-searches" className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Bookmark className="h-4 w-4 text-brand-700" aria-hidden /> Saved searches
          <span className="text-sm font-normal text-slate-500">({savedSearches.length})</span>
        </h2>
        <SavedSearchList
          items={savedSearches.map((s) => ({
            id: s.id,
            name: s.name,
            query: toParams(s.query),
            createdAt: s.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
